package vn.edu.hcmut.emobility.hub;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.charging.ChargingSession;
import vn.edu.hcmut.emobility.charging.ChargingSessionRepository;
import vn.edu.hcmut.emobility.charging.SessionStatus;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.fleet.FleetEvents;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.hub.HubDtos.*;
import vn.edu.hcmut.emobility.maintenance.ImpactService;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.ImpactReport;
import vn.edu.hcmut.emobility.personal.BookingStatus;
import vn.edu.hcmut.emobility.personal.SlotBookingRepository;
import vn.edu.hcmut.emobility.rebalance.TransferOrderRepository;
import vn.edu.hcmut.emobility.rental.ReservationRepository;
import vn.edu.hcmut.emobility.rental.ReservationStatus;

/** MO03 quản lý Hub, MO04 quản lý cổng sạc. */
@Service
public class HubAdminService {

    public record PortChangeResult(PortView port, String message, ImpactReport impact) {}

    private final HubRepository hubs;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final VehicleRepository vehicles;
    private final ReservationRepository reservations;
    private final SlotBookingRepository bookings;
    private final TransferOrderRepository transfers;
    private final ChargingSessionRepository sessions;
    private final ImpactService impact;
    private final HubStatsService stats;
    private final NotificationService notifications;
    private final FleetEvents events;
    private final AuditService audit;

    public HubAdminService(HubRepository hubs, ParkingSlotRepository slots, ChargingPortRepository ports, VehicleRepository vehicles,
                           ReservationRepository reservations, SlotBookingRepository bookings, TransferOrderRepository transfers,
                           ChargingSessionRepository sessions, ImpactService impact, HubStatsService stats,
                           NotificationService notifications, FleetEvents events, AuditService audit) {
        this.hubs = hubs;
        this.slots = slots;
        this.ports = ports;
        this.vehicles = vehicles;
        this.reservations = reservations;
        this.bookings = bookings;
        this.transfers = transfers;
        this.sessions = sessions;
        this.impact = impact;
        this.stats = stats;
        this.notifications = notifications;
        this.events = events;
        this.audit = audit;
    }

    @Transactional
    public HubSummary create(Long operatorId, HubRequest r) {
        if (hubs.existsByCodeIgnoreCase(r.code()) || hubs.existsByNameIgnoreCase(r.name().trim())) {
            throw new BusinessException(ErrorCode.HUB_NAME_TAKEN, ErrorCode.HUB_NAME_TAKEN.getMessage(), Map.of("name", "Tên hoặc mã đã tồn tại"));
        }
        Hub h = hubs.saveAndFlush(new Hub(r.code().toUpperCase(), r.name().trim(), r.address(), r.area(), r.latitude(), r.longitude(), r.type(),
                r.sharedCapacity() + r.personalCapacity()));
        addSlots(h.getId(), SlotKind.SHARED, r.sharedCapacity());
        addSlots(h.getId(), SlotKind.PERSONAL, r.personalCapacity());
        int n = r.initialPorts() == null ? 0 : r.initialPorts();
        for (int i = 1; i <= n; i++) ports.save(new ChargingPort(h.getId(), String.format("C-%02d", i), 3.3, "TYPE_2"));
        audit.record(operatorId, "HUB_CREATE", "HUB", h.getId(), Map.of("code", h.getCode()));
        events.hubChanged(h.getId());
        return stats.summary(h, null);
    }

    /** E3: không giảm sức chứa xuống dưới số chỗ đang sử dụng thực tế. */
    @Transactional
    public HubSummary update(Long operatorId, Long hubId, HubRequest r) {
        Hub h = hubs.lockById(hubId).orElseThrow(() -> BusinessException.notFound("Hub", hubId));
        if (!h.getName().equalsIgnoreCase(r.name().trim()) && hubs.existsByNameIgnoreCase(r.name().trim())) {
            throw new BusinessException(ErrorCode.HUB_NAME_TAKEN, ErrorCode.HUB_NAME_TAKEN.getMessage(), Map.of("name", "Tên Hub đã tồn tại"));
        }
        resize(hubId, SlotKind.SHARED, r.sharedCapacity());
        resize(hubId, SlotKind.PERSONAL, r.personalCapacity());
        h.update(r.name().trim(), r.address(), r.area(), r.latitude(), r.longitude(), r.type());
        h.setParkingCapacity(r.sharedCapacity() + r.personalCapacity());
        audit.record(operatorId, "HUB_UPDATE", "HUB", hubId, Map.of("shared", r.sharedCapacity(), "personal", r.personalCapacity()));
        events.hubChanged(hubId);
        return stats.summary(h, stats.countersByHub().get(hubId));
    }

    private void resize(Long hubId, SlotKind kind, int target) {
        List<ParkingSlot> list = slots.findByHubIdAndKindOrderByCode(hubId, kind).stream().filter(s -> s.getStatus() != SlotStatus.DISABLED).toList();
        if (target > list.size()) {
            addSlots(hubId, kind, target - list.size());
            return;
        }
        int toRemove = list.size() - target;
        List<ParkingSlot> removable = new ArrayList<>();
        for (int i = list.size() - 1; i >= 0 && removable.size() < toRemove; i--) {
            ParkingSlot s = list.get(i);
            boolean futureBookings = kind == SlotKind.PERSONAL && !bookings.findBySlotIdAndStatusIn(s.getId(),
                    Set.of(BookingStatus.BOOKED, BookingStatus.IN_USE, BookingStatus.CHECKOUT_REQUESTED, BookingStatus.AWAITING_EXIT)).isEmpty();
            if (s.getStatus() == SlotStatus.AVAILABLE && !futureBookings) removable.add(s);
        }
        if (removable.size() < toRemove) {
            long inUse = list.size() - removable.size();
            throw new BusinessException(ErrorCode.CAPACITY_BELOW_USAGE, "Không thể thấp hơn số chỗ đang sử dụng (" + inUse + ")",
                    Map.of(kind == SlotKind.SHARED ? "sharedCapacity" : "personalCapacity", "Tối thiểu " + (list.size() - removable.size())));
        }
        removable.forEach(s -> slots.lockById(s.getId()).ifPresent(x -> x.setStatus(SlotStatus.DISABLED)));
    }

    private void addSlots(Long hubId, SlotKind kind, int count) {
        String prefix = kind == SlotKind.SHARED ? "S-" : "P-";
        Map<String, ParkingSlot> byCode = new HashMap<>();
        slots.findByHubIdOrderByCode(hubId).forEach(s -> byCode.put(s.getCode(), s));
        int added = 0;
        for (int i = 1; added < count; i++) {
            String code = String.format("%s%02d", prefix, i);
            ParkingSlot existing = byCode.get(code);
            if (existing == null) {
                slots.save(new ParkingSlot(hubId, code, kind));
                added++;
            } else if (existing.getStatus() == SlotStatus.DISABLED && existing.getKind() == kind) {
                slots.lockById(existing.getId()).ifPresent(x -> x.setStatus(SlotStatus.PENDING_CHECK)); // dùng lại ô đã gỡ
                added++;
            }
        }
    }

    /** E2: còn xe đang hoạt động hoặc đơn/lệnh hiệu lực → từ chối ngưng hoạt động. */
    @Transactional
    public HubSummary deactivate(Long operatorId, Long hubId, String reason) {
        Hub h = hubs.lockById(hubId).orElseThrow(() -> BusinessException.notFound("Hub", hubId));
        List<String> blockers = new ArrayList<>();
        long busyVehicles = vehicles.findByHubIdOrderByBatteryPercentDesc(hubId).stream().filter(v -> v.getStatus().inCustomerUse()).count();
        if (busyVehicles > 0) blockers.add(busyVehicles + " xe đang được đặt/sử dụng");
        long res = reservations.countByHubIdAndStatusIn(hubId, Set.of(ReservationStatus.RESERVED, ReservationStatus.PICKUP_PENDING));
        if (res > 0) blockers.add(res + " đơn đặt xe hiệu lực");
        long bk = bookings.countByHubIdAndStatusIn(hubId, Set.of(BookingStatus.BOOKED, BookingStatus.IN_USE, BookingStatus.CHECKOUT_REQUESTED, BookingStatus.AWAITING_EXIT));
        if (bk > 0) blockers.add(bk + " đơn đặt chỗ/sạc hiệu lực");
        long tr = transfers.findTop100ByOrderByIdDesc().stream().filter(o -> o.getStatus().open()
                && (o.getSourceHubId().equals(hubId) || o.getTargetHubId().equals(hubId))).count();
        if (tr > 0) blockers.add(tr + " lệnh điều chuyển đang mở");
        if (!blockers.isEmpty()) {
            throw new BusinessException(ErrorCode.HUB_IN_USE, "Không thể ngưng hoạt động: " + String.join(", ", blockers) + ". Vui lòng xử lý trước",
                    Map.of("blockers", blockers));
        }
        h.deactivate(reason);
        audit.record(operatorId, "HUB_DEACTIVATE", "HUB", hubId, Map.of("reason", reason));
        events.hubChanged(hubId);
        return stats.summary(h, stats.countersByHub().get(hubId));
    }

    @Transactional
    public HubSummary activate(Long operatorId, Long hubId) {
        Hub h = hubs.lockById(hubId).orElseThrow(() -> BusinessException.notFound("Hub", hubId));
        h.activate();
        audit.record(operatorId, "HUB_ACTIVATE", "HUB", hubId, null);
        events.hubChanged(hubId);
        return stats.summary(h, stats.countersByHub().get(hubId));
    }

    // ------------------------------------------------------------------ MO04
    @Transactional
    public PortView addPort(Long operatorId, Long hubId, PortRequest r) {
        Hub h = hubs.findById(hubId).orElseThrow(() -> BusinessException.notFound("Hub", hubId));
        if (!h.isActive()) throw new BusinessException(ErrorCode.HUB_INACTIVE);
        if (ports.existsByHubIdAndCode(hubId, r.code().toUpperCase())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Mã cổng đã tồn tại trong Hub", Map.of("code", "Trùng mã cổng"));
        }
        ChargingPort p = ports.saveAndFlush(new ChargingPort(hubId, r.code().toUpperCase(), r.powerKw(), r.connectorType()));
        audit.record(operatorId, "PORT_ADD", "PORT", p.getId(), Map.of("powerKw", r.powerKw()));
        events.hubChanged(hubId);
        return view(p);
    }

    @Transactional
    public PortView updatePort(Long operatorId, Long portId, PortRequest r) {
        ChargingPort p = ports.lockById(portId).orElseThrow(() -> BusinessException.notFound("Cổng sạc", portId));
        if (p.getStatus() == PortStatus.OCCUPIED && !p.getConnectorType().equals(r.connectorType())) {
            throw new BusinessException(ErrorCode.PORT_IN_USE, "Không đổi loại đầu sạc khi cổng đang sạc");
        }
        p.setSpec(r.code().toUpperCase(), r.powerKw(), r.connectorType());
        audit.record(operatorId, "PORT_UPDATE", "PORT", portId, null);
        return view(p);
    }

    /**
     * Đánh dấu bảo trì / hoạt động lại. E2: đang sạc → cảnh báo xung đột, cần xác nhận cưỡng chế.
     * Góp ý #15: khi ngưng cổng, các đặt chỗ/lịch sạc phụ thuộc được chuyển cổng khác hoặc thông báo người dùng.
     */
    @Transactional
    public PortChangeResult setPortStatus(Long operatorId, Long portId, PortStatusRequest r) {
        ChargingPort p = ports.lockById(portId).orElseThrow(() -> BusinessException.notFound("Cổng sạc", portId));
        if (r.status() == PortStatus.AVAILABLE) {
            if (p.getStatus() == PortStatus.MAINTENANCE || p.getStatus() == PortStatus.DISABLED || p.getStatus() == PortStatus.FAULTY) {
                p.setStatus(PortStatus.PENDING_CHECK);
                p.setDisableAfterSession(false);
            }
            audit.record(operatorId, "PORT_REACTIVATE", "PORT", portId, null);
            events.hubChanged(p.getHubId());
            return new PortChangeResult(view(p), "Cổng chuyển sang Chờ kiểm tra – sẽ hoạt động khi cảm biến xác nhận", ImpactReport.empty());
        }
        if (r.status() != PortStatus.MAINTENANCE && r.status() != PortStatus.DISABLED) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Chỉ hỗ trợ MAINTENANCE, DISABLED hoặc AVAILABLE");
        }
        Optional<ChargingSession> live = sessions.findFirstByPortIdAndStatusIn(portId, Set.of(SessionStatus.STARTING, SessionStatus.ACTIVE, SessionStatus.STOPPING));
        if (live.isPresent() && !r.force()) {
            throw new BusinessException(ErrorCode.PORT_IN_USE, "Cổng đang có phiên sạc – xác nhận cưỡng chế để dừng phiên và bảo trì",
                    Map.of("requiresForce", true));
        }
        live.ifPresent(s -> {
            sessions.lockById(s.getId()).ifPresent(ChargingSession::fail);
            if (s.getSlotBookingId() != null) {
                bookings.findById(s.getSlotBookingId()).ifPresent(b -> notifications.notify(b.getOwnerId(), "CHARGING_INTERRUPTED",
                        "Phiên sạc bị gián đoạn", "Cổng " + p.getCode() + " cần bảo trì khẩn cấp. Vui lòng liên hệ nhân viên tại Hub."));
            }
            audit.record(operatorId, "PORT_FORCE_MAINTENANCE", "PORT", portId, Map.of("session", s.getId()));
        });
        p.setStatus(r.status());
        ImpactReport rep = impact.onPortUnavailable(p, r.status() == PortStatus.MAINTENANCE ? "bảo trì" : "ngưng sử dụng");
        audit.record(operatorId, "PORT_" + r.status(), "PORT", portId, Map.of("moved", rep.moved(), "cancelled", rep.cancelled()));
        events.hubChanged(p.getHubId());
        return new PortChangeResult(view(p), "Đã cập nhật cổng " + p.getCode(), rep);
    }

    /** Gỡ cổng. E1: đang có xe cắm sạc → chỉ đánh dấu "ngưng sau khi phiên hiện tại kết thúc". */
    @Transactional
    public PortChangeResult removePort(Long operatorId, Long portId) {
        ChargingPort p = ports.lockById(portId).orElseThrow(() -> BusinessException.notFound("Cổng sạc", portId));
        if (p.getStatus() == PortStatus.OCCUPIED) {
            p.setDisableAfterSession(true);
            ImpactReport rep = impact.onPortUnavailable(p, "gỡ bỏ sau phiên hiện tại");
            return new PortChangeResult(view(p), "Cổng đang sạc – sẽ ngưng sau khi phiên hiện tại kết thúc", rep);
        }
        p.setStatus(PortStatus.DISABLED);
        ImpactReport rep = impact.onPortUnavailable(p, "gỡ bỏ");
        audit.record(operatorId, "PORT_REMOVE", "PORT", portId, null);
        events.hubChanged(p.getHubId());
        return new PortChangeResult(view(p), "Đã gỡ cổng " + p.getCode(), rep);
    }

    private PortView view(ChargingPort p) {
        return new PortView(p.getId(), p.getCode(), p.getPowerKw(), p.getConnectorType(), p.getStatus(), p.isDisableAfterSession(), p.getStatus() == PortStatus.AVAILABLE);
    }
}
