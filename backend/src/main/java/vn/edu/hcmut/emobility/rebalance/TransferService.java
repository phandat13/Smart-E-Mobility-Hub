package vn.edu.hcmut.emobility.rebalance;

import java.time.Clock;
import java.time.Instant;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.Codes;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.fleet.*;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.rebalance.TransferDtos.*;

/** RB01: tạo lệnh điều chuyển (nguyên tử: khóa xe + giữ capacity Hub đích + tạo lệnh), hàng đợi tài xế. */
@Service
public class TransferService {

    private static final Logger log = LoggerFactory.getLogger(TransferService.class);

    private final TransferOrderRepository orders;
    private final TransferItemRepository items;
    private final DriverRepository drivers;
    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final HubRepository hubs;
    private final TransferMapper mapper;
    private final AlertService alerts;
    private final NotificationService notifications;
    private final FleetEvents events;
    private final ResourceVerifier verifier;
    private final AuditService audit;
    private final TxRunner tx;
    private final AppProperties props;
    private final Clock clock;

    public TransferService(TransferOrderRepository orders, TransferItemRepository items, DriverRepository drivers, VehicleRepository vehicles,
                           ParkingSlotRepository slots, HubRepository hubs, TransferMapper mapper, AlertService alerts,
                           NotificationService notifications, FleetEvents events, ResourceVerifier verifier, AuditService audit,
                           TxRunner tx, AppProperties props, Clock clock) {
        this.orders = orders;
        this.items = items;
        this.drivers = drivers;
        this.vehicles = vehicles;
        this.slots = slots;
        this.hubs = hubs;
        this.mapper = mapper;
        this.alerts = alerts;
        this.notifications = notifications;
        this.events = events;
        this.verifier = verifier;
        this.audit = audit;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    /** RB01 bước 2: xe "Sẵn sàng" tại Hub nguồn, sắp xếp pin từ cao tới thấp. */
    @Transactional(readOnly = true)
    public List<CandidateView> candidates(Long hubId) {
        return vehicles.findByHubIdAndStatusOrderByBatteryPercentDesc(hubId, VehicleStatus.AVAILABLE).stream()
                .map(v -> new CandidateView(v.getId(), v.getCode(), v.getType().name(), v.getBatteryPercent(), v.getStatus().name())).toList();
    }

    @Transactional
    public OrderView create(Long operatorId, CreateTransferRequest r) {
        return mapper.view(createInTx(operatorId, r.sourceHubId(), r.targetHubId(), r.vehicleIds(), r.alertId(), null, r.note()), null);
    }

    /** SI05: tạo lệnh từ khuyến nghị – tự chọn xe pin cao nhất, vẫn qua đúng bước kiểm tra + giữ tài nguyên của RB01. */
    @Transactional(propagation = Propagation.MANDATORY)
    public TransferOrder createFromRecommendation(Long operatorId, Long source, Long target, int count, Long recommendationId) {
        List<Long> ids = vehicles.availableIds(source, (short) props.vehicle().minBatteryPercent(), PageRequest.of(0, count));
        if (ids.size() < count) {
            throw new BusinessException(ErrorCode.RECOMMENDATION_INFEASIBLE, "Hub nguồn chỉ còn " + ids.size() + "/" + count + " xe sẵn sàng");
        }
        return createInTx(operatorId, source, target, ids, null, recommendationId, "Áp dụng khuyến nghị mô phỏng #" + recommendationId);
    }

    /**
     * RB01 bước 3 – một giao dịch nguyên tử:
     * (a) khóa từng xe bằng UPDATE có điều kiện (Sẵn sàng + đúng Hub nguồn) → TRANSFER_LOCKED;
     * (b) góp ý #10: giữ N ô trống tại Hub đích (FOR UPDATE SKIP LOCKED) → HELD cho đúng N xe đang chuyển tới;
     * (c) tạo lệnh + từng mục xe. Bất kỳ bước nào thiếu → rollback, không xe/ô nào bị khóa.
     */
    private TransferOrder createInTx(Long operatorId, Long source, Long target, List<Long> vehicleIds, Long alertId, Long recId, String note) {
        if (source.equals(target)) throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Hub nguồn và Hub đích phải khác nhau");
        Hub src = hubs.findById(source).orElseThrow(() -> BusinessException.notFound("Hub nguồn", source));
        Hub dst = hubs.findById(target).orElseThrow(() -> BusinessException.notFound("Hub đích", target));
        if (!src.isActive() || !dst.isActive()) throw new BusinessException(ErrorCode.HUB_INACTIVE);
        List<Long> ids = new ArrayList<>(new TreeSet<>(vehicleIds)); // thứ tự khóa cố định tránh deadlock
        Instant now = clock.instant();
        List<Long> failed = new ArrayList<>();
        for (Long id : ids) {
            if (vehicles.casAtHub(id, source, Set.of(VehicleStatus.AVAILABLE), VehicleStatus.TRANSFER_LOCKED, now) == 0) failed.add(id);
        }
        if (!failed.isEmpty()) {
            List<String> codes = vehicles.findAllById(failed).stream().map(Vehicle::getCode).toList();
            throw new BusinessException(ErrorCode.VEHICLE_UNAVAILABLE, "Các xe không còn khả dụng (vừa được đặt/thuê/khóa): " + String.join(", ", codes)
                    + ". Không xe nào bị khóa, vui lòng chọn lại", Map.of("unavailable", codes));
        }
        List<ParkingSlot> held = slots.lockFreeSharedSlots(target, ids.size());
        if (held.size() < ids.size()) {
            throw new BusinessException(ErrorCode.HUB_FULL, "Hub đích chỉ còn " + held.size() + " chỗ trống cho " + ids.size() + " xe");
        }
        TransferOrder o = orders.saveAndFlush(new TransferOrder(Codes.next("DC", now), source, target, alertId, recId, operatorId, note));
        for (int i = 0; i < ids.size(); i++) {
            TransferItem it = items.saveAndFlush(new TransferItem(o.getId(), ids.get(i)));
            held.get(i).holdFor(it.getId());
            it.holdSlot(held.get(i).getId());
        }
        Optional<Driver> driver = drivers.lockFirstFree();
        driver.ifPresent(d -> {
            d.setStatus(DriverStatus.BUSY);
            o.assign(d.getId());
            notifications.notify(d.getUserId(), "TRANSFER_ASSIGNED", "Lệnh điều chuyển mới",
                    "Lệnh " + o.getCode() + ": " + ids.size() + " xe từ " + src.getName() + " → " + dst.getName());
        });
        if (alertId != null) {
            try {
                alerts.acknowledge(alertId);
            } catch (BusinessException ignored) {
                // cảnh báo có thể đã được xử lý
            }
        }
        events.hubChanged(source);
        events.hubChanged(target);
        audit.record(operatorId, "TRANSFER_CREATE", "TRANSFER", o.getId(),
                Map.of("vehicles", ids.size(), "heldSlots", held.stream().map(ParkingSlot::getCode).toList(), "queued", driver.isEmpty()));
        return o;
    }

    @Transactional(readOnly = true)
    public List<OrderView> list() {
        return orders.findTop100ByOrderByIdDesc().stream().map(o -> mapper.view(o, null)).toList();
    }

    @Transactional(readOnly = true)
    public OrderView get(Long id) {
        return mapper.view(orders.findById(id).orElseThrow(() -> BusinessException.notFound("Lệnh điều chuyển", id)), null);
    }

    @Transactional(readOnly = true)
    public List<DriverView> drivers() {
        return drivers.findAllByOrderById().stream().map(mapper::driver).toList();
    }

    /** Hủy lệnh khi chưa gom xe nào: trả xe về Chờ kiểm tra, giải phóng ô giữ ở Hub đích. */
    public OrderView cancel(Long operatorId, Long id) {
        List<Long> toVerify = tx.inNewTx(() -> {
            TransferOrder o = orders.lockById(id).orElseThrow(() -> BusinessException.notFound("Lệnh điều chuyển", id));
            List<TransferItem> list = items.findByOrderIdOrderById(id);
            if (list.stream().anyMatch(i -> i.getStatus() != TransferItemStatus.LOCKED)) {
                throw new BusinessException(ErrorCode.INVALID_STATE, "Lệnh đã bắt đầu gom xe, không thể hủy");
            }
            List<Long> vids = new ArrayList<>();
            for (TransferItem i : list) {
                releaseHeldSlot(i);
                i.remove("Lệnh bị hủy");
                vehicles.lockById(i.getVehicleId()).ifPresent(v -> {
                    if (v.getStatus() == VehicleStatus.TRANSFER_LOCKED) v.setStatus(VehicleStatus.PENDING_CHECK);
                });
                vids.add(i.getVehicleId());
            }
            o.setStatus(TransferOrderStatus.CANCELLED);
            o.completed(clock.instant());
            freeDriver(o);
            events.hubChanged(o.getSourceHubId());
            events.hubChanged(o.getTargetHubId());
            audit.record(operatorId, "TRANSFER_CANCEL", "TRANSFER", id, null);
            return vids;
        });
        toVerify.forEach(this::safeVerify);
        assignQueued();
        return tx.inNewTx(() -> get(id));
    }

    /** E1: tài xế rảnh trở lại → nhận lệnh đang chờ trong hàng đợi. */
    public int assignQueued() {
        int n = 0;
        for (TransferOrder q : tx.inNewTx(() -> orders.findByStatusOrderByIdAsc(TransferOrderStatus.QUEUED))) {
            Boolean ok = tx.inNewTx(() -> {
                TransferOrder o = orders.lockById(q.getId()).orElseThrow();
                if (o.getStatus() != TransferOrderStatus.QUEUED) return false;
                Optional<Driver> d = drivers.lockFirstFree();
                if (d.isEmpty()) return false;
                d.get().setStatus(DriverStatus.BUSY);
                o.assign(d.get().getId());
                notifications.notify(d.get().getUserId(), "TRANSFER_ASSIGNED", "Lệnh điều chuyển mới", "Bạn được giao lệnh " + o.getCode());
                return true;
            });
            if (!Boolean.TRUE.equals(ok)) break;
            n++;
        }
        return n;
    }

    void releaseHeldSlot(TransferItem i) {
        if (i.getHeldSlotId() != null) {
            slots.lockById(i.getHeldSlotId()).ifPresent(s -> {
                if (s.getHeldForItemId() != null && s.getHeldForItemId().equals(i.getId())) s.releaseHold();
            });
        }
    }

    void freeDriver(TransferOrder o) {
        if (o.getDriverId() != null && orders.countByDriverIdAndStatusIn(o.getDriverId(), Set.of(TransferOrderStatus.ASSIGNED,
                TransferOrderStatus.LOADING, TransferOrderStatus.IN_TRANSIT, TransferOrderStatus.PARTIALLY_DELIVERED)) <= 1) {
            drivers.findById(o.getDriverId()).ifPresent(d -> d.setStatus(DriverStatus.FREE));
        }
    }

    void safeVerify(Long vehicleId) {
        try {
            tx.runInNewTx(() -> verifier.verifyVehicle(vehicleId));
        } catch (RuntimeException e) {
            log.warn("Xác minh xe {} thất bại: {}", vehicleId, e.getMessage());
        }
    }
}
