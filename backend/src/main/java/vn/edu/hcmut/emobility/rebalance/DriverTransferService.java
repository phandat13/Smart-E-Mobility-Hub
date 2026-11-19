package vn.edu.hcmut.emobility.rebalance;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.fleet.FleetEvents;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.Hub;
import vn.edu.hcmut.emobility.hub.HubRepository;
import vn.edu.hcmut.emobility.hub.ParkingSlot;
import vn.edu.hcmut.emobility.hub.ParkingSlotRepository;
import vn.edu.hcmut.emobility.maintenance.IncidentService;
import vn.edu.hcmut.emobility.maintenance.IncidentSource;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.ReportRequest;
import vn.edu.hcmut.emobility.maintenance.TargetType;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;
import vn.edu.hcmut.emobility.rebalance.TransferDtos.*;

/** RB02: tài xế cập nhật tiến trình gom xe, vận chuyển, bàn giao – theo TỪNG xe (góp ý #9). */
@Service
public class DriverTransferService {

    private final TransferOrderRepository orders;
    private final TransferItemRepository items;
    private final DriverRepository drivers;
    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final HubRepository hubs;
    private final TransferService transfers;
    private final TransferMapper mapper;
    private final IncidentService incidents;
    private final AlertService alerts;
    private final FleetEvents events;
    private final AuditService audit;
    private final TxRunner tx;
    private final Clock clock;

    public DriverTransferService(TransferOrderRepository orders, TransferItemRepository items, DriverRepository drivers, VehicleRepository vehicles,
                                 ParkingSlotRepository slots, HubRepository hubs, TransferService transfers, TransferMapper mapper,
                                 IncidentService incidents, AlertService alerts, FleetEvents events, AuditService audit, TxRunner tx, Clock clock) {
        this.orders = orders;
        this.items = items;
        this.drivers = drivers;
        this.vehicles = vehicles;
        this.slots = slots;
        this.hubs = hubs;
        this.transfers = transfers;
        this.mapper = mapper;
        this.incidents = incidents;
        this.alerts = alerts;
        this.events = events;
        this.audit = audit;
        this.tx = tx;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<OrderView> myOrders(Long userId) {
        Driver d = driver(userId);
        return orders.findByDriverIdOrderByIdDesc(d.getId()).stream()
                .sorted((a, b) -> Boolean.compare(!a.getStatus().open(), !b.getStatus().open()))
                .map(o -> mapper.view(o, null)).toList();
    }

    /** Bước 1: quét mã từng xe tại Hub nguồn, đưa lên xe vận chuyển. */
    @Transactional
    public OrderView scanLoad(Long userId, Long orderId, String vehicleCode) {
        TransferOrder o = myOrder(userId, orderId);
        TransferItem it = item(o, vehicleCode);
        if (it.getStatus() == TransferItemStatus.LOADED) return mapper.view(o, "Xe " + vehicleCode + " đã được quét trước đó");
        if (it.getStatus() != TransferItemStatus.LOCKED) throw new BusinessException(ErrorCode.TRANSFER_ITEM_STATE);
        it.loaded(clock.instant());
        slots.lockByVehicleId(it.getVehicleId()).ifPresent(ParkingSlot::vacate);
        refresh(o);
        events.hubChanged(o.getSourceHubId());
        return mapper.view(o, "Đã gom xe " + vehicleCode);
    }

    /** Bước 2: "Bắt đầu vận chuyển" – xe đã gom chuyển IN_TRANSIT; xe chưa gom bị loại khỏi lệnh. */
    public OrderView startTransport(Long userId, Long orderId) {
        List<Long> removed = tx.inNewTx(() -> {
            TransferOrder o = myOrder(userId, orderId);
            List<TransferItem> list = items.findByOrderIdOrderById(orderId);
            if (list.stream().noneMatch(i -> i.getStatus() == TransferItemStatus.LOADED)) {
                throw new BusinessException(ErrorCode.INVALID_STATE, "Chưa quét xe nào lên xe vận chuyển");
            }
            List<Long> rm = new java.util.ArrayList<>();
            for (TransferItem i : list) {
                if (i.getStatus() == TransferItemStatus.LOADED) {
                    i.inTransit();
                    vehicles.lockById(i.getVehicleId()).ifPresent(v -> { v.setStatus(VehicleStatus.IN_TRANSIT); v.setHubId(null); });
                } else if (i.getStatus() == TransferItemStatus.LOCKED) {
                    transfers.releaseHeldSlot(i);
                    i.remove("Không được gom lên xe vận chuyển");
                    vehicles.lockById(i.getVehicleId()).ifPresent(v -> v.setStatus(VehicleStatus.PENDING_CHECK));
                    rm.add(i.getVehicleId());
                }
            }
            o.started(clock.instant());
            refresh(o);
            events.hubChanged(o.getSourceHubId());
            events.hubChanged(o.getTargetHubId());
            audit.record(userId, "TRANSFER_START", "TRANSFER", orderId, Map.of("removed", rm.size()));
            return rm;
        });
        removed.forEach(transfers::safeVerify);
        return tx.inNewTx(() -> mapper.view(orders.findById(orderId).orElseThrow(), "Đã bắt đầu vận chuyển"));
    }

    /** Bước 3–4: bàn giao từng xe vào ô đã giữ sẵn tại Hub đích; xe chờ xác minh trước khi Sẵn sàng. */
    public OrderView deliver(Long userId, Long orderId, String vehicleCode) {
        Long vehicleId = tx.inNewTx(() -> {
            TransferOrder o = myOrder(userId, orderId);
            TransferItem it = item(o, vehicleCode);
            if (it.getStatus() == TransferItemStatus.DELIVERED) return null;
            if (it.getStatus() != TransferItemStatus.IN_TRANSIT) throw new BusinessException(ErrorCode.TRANSFER_ITEM_STATE, "Xe chưa ở trạng thái đang vận chuyển");
            Instant now = clock.instant();
            ParkingSlot slot = it.getHeldSlotId() == null ? null : slots.lockById(it.getHeldSlotId()).orElse(null);
            if (slot == null) throw new BusinessException(ErrorCode.HUB_FULL, "Không còn ô giữ sẵn cho xe này – vui lòng đổi Hub đích");
            Vehicle v = vehicles.lockById(it.getVehicleId()).orElseThrow();
            slot.occupy(v.getId());
            v.setHubId(o.getTargetHubId());
            v.setStatus(VehicleStatus.PENDING_CHECK);
            v.seen(now);
            it.delivered(o.getTargetHubId(), now);
            refresh(o);
            events.hubChanged(o.getTargetHubId());
            return v.getId();
        });
        if (vehicleId != null) transfers.safeVerify(vehicleId);
        afterTerminal(orderId);
        return tx.inNewTx(() -> mapper.view(orders.findById(orderId).orElseThrow(), "Đã bàn giao xe " + vehicleCode));
    }

    /** E2: xe hỏng trong quá trình điều chuyển → loại khỏi lệnh (FAILED), tạo báo cáo xe lỗi (MT01). */
    public OrderView reportBroken(Long userId, Long orderId, BrokenRequest r) {
        tx.runInNewTx(() -> {
            TransferOrder o = myOrder(userId, orderId);
            TransferItem it = item(o, r.vehicleCode());
            if (it.getStatus().terminal()) throw new BusinessException(ErrorCode.TRANSFER_ITEM_STATE);
            boolean loaded = it.getStatus() != TransferItemStatus.LOCKED;
            transfers.releaseHeldSlot(it);
            it.fail(r.note());
            Vehicle v = vehicles.lockById(it.getVehicleId()).orElseThrow();
            v.setStatus(VehicleStatus.FAULTY);
            if (v.getHubId() == null) v.setHubId(o.getSourceHubId());
            refresh(o);
            incidents.report(userId, new ReportRequest(o.getSourceHubId(), TargetType.VEHICLE, v.getId(), null,
                    "Hỏng khi điều chuyển", r.note() + (loaded ? " (đã gom lên xe tải)" : ""), null, null, false), IncidentSource.DRIVER);
            events.hubChanged(o.getSourceHubId());
            events.hubChanged(o.getTargetHubId());
        });
        afterTerminal(orderId);
        return tx.inNewTx(() -> mapper.view(orders.findById(orderId).orElseThrow(), "Đã loại xe " + r.vehicleCode() + " khỏi lệnh và tạo báo cáo xe lỗi"));
    }

    /** E1: Hub đích hết chỗ khi xe đang trên đường → đổi Hub đích: giải phóng ô giữ cũ, giữ ô mới (nguyên tử). */
    @Transactional
    public OrderView reroute(Long userId, Long orderId, RerouteRequest r) {
        TransferOrder o = myOrder(userId, orderId);
        if (r.newTargetHubId().equals(o.getTargetHubId()) || r.newTargetHubId().equals(o.getSourceHubId())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Hub đích mới không hợp lệ");
        }
        Hub nh = hubs.findById(r.newTargetHubId()).filter(Hub::isActive).orElseThrow(() -> new BusinessException(ErrorCode.HUB_INACTIVE));
        List<TransferItem> pending = items.findByOrderIdOrderById(orderId).stream().filter(i -> !i.getStatus().terminal()).toList();
        List<ParkingSlot> fresh = slots.lockFreeSharedSlots(nh.getId(), pending.size());
        if (fresh.size() < pending.size()) {
            throw new BusinessException(ErrorCode.HUB_FULL, nh.getName() + " chỉ còn " + fresh.size() + " chỗ cho " + pending.size() + " xe");
        }
        Long oldTarget = o.getTargetHubId();
        for (int i = 0; i < pending.size(); i++) {
            transfers.releaseHeldSlot(pending.get(i));
            fresh.get(i).holdFor(pending.get(i).getId());
            pending.get(i).holdSlot(fresh.get(i).getId());
        }
        o.retarget(nh.getId(), "Đổi Hub đích: " + r.reason());
        alerts.raise(AlertType.CAPACITY_CONFLICT, oldTarget, "TRANSFER", orderId,
                AlertSeverity.INFO, "Lệnh " + o.getCode() + " đổi Hub đích sang " + nh.getName() + ": " + r.reason());
        events.hubChanged(oldTarget);
        events.hubChanged(nh.getId());
        audit.record(userId, "TRANSFER_REROUTE", "TRANSFER", orderId, Map.of("from", oldTarget, "to", nh.getId(), "vehicles", pending.size()));
        return mapper.view(o, "Đã đổi Hub đích sang " + nh.getName() + " và giữ " + pending.size() + " chỗ");
    }

    private void afterTerminal(Long orderId) {
        boolean freed = tx.inNewTx(() -> {
            TransferOrder o = orders.lockById(orderId).orElseThrow();
            if (o.getStatus().open()) return false;
            if (o.getCompletedAt() == null) o.completed(clock.instant());
            transfers.freeDriver(o);
            return true;
        });
        if (freed) transfers.assignQueued();
    }

    private void refresh(TransferOrder o) {
        List<TransferItemStatus> st = items.findByOrderIdOrderById(o.getId()).stream().map(TransferItem::getStatus).toList();
        o.setStatus(TransferStatusPolicy.derive(st, o.getDriverId() != null, false));
    }

    private Driver driver(Long userId) {
        return drivers.findByUserId(userId).orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN, "Tài khoản không phải tài xế điều chuyển"));
    }

    private TransferOrder myOrder(Long userId, Long orderId) {
        Driver d = driver(userId);
        TransferOrder o = orders.lockById(orderId).orElseThrow(() -> BusinessException.notFound("Lệnh điều chuyển", orderId));
        if (!d.getId().equals(o.getDriverId())) throw BusinessException.notFound("Lệnh điều chuyển", orderId);
        if (!o.getStatus().open()) throw new BusinessException(ErrorCode.INVALID_STATE, "Lệnh đã kết thúc");
        return o;
    }

    private TransferItem item(TransferOrder o, String vehicleCode) {
        Long vid = vehicles.findIdByCode(vehicleCode.trim().toUpperCase()).orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_NOT_IN_ORDER));
        return items.findByOrderIdAndVehicleId(o.getId(), vid).orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_NOT_IN_ORDER));
    }
}
