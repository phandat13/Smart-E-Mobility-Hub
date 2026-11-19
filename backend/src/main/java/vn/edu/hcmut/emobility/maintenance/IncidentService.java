package vn.edu.hcmut.emobility.maintenance;

import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.account.AppUser;
import vn.edu.hcmut.emobility.account.AppUserRepository;
import vn.edu.hcmut.emobility.core.common.Codes;
import vn.edu.hcmut.emobility.core.common.JsonSupport;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.fleet.FleetEvents;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.maintenance.MaintenanceDtos.*;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;

/** MT01: báo cáo sự cố (sinh viên, tài xế, hệ thống, đánh giá ≤ 2 sao) + hàng đợi sự cố cho MT02. */
@Service
public class IncidentService {

    static final Set<IncidentStatus> OPEN = Set.of(IncidentStatus.OPEN, IncidentStatus.ASSIGNED);
    private static final Set<VehicleStatus> FLAGGABLE = Set.of(VehicleStatus.AVAILABLE, VehicleStatus.PENDING_CHECK, VehicleStatus.NEEDS_CHARGE, VehicleStatus.RESERVED);

    private final IncidentRepository incidents;
    private final IncidentFollowUpRepository followUps;
    private final MaintenanceOrderRepository orders;
    private final VehicleRepository vehicles;
    private final ChargingPortRepository ports;
    private final ParkingSlotRepository slots;
    private final HubRepository hubs;
    private final AppUserRepository users;
    private final ImpactService impact;
    private final AlertService alerts;
    private final NotificationService notifications;
    private final FleetEvents events;
    private final JsonSupport json;
    private final Clock clock;

    public IncidentService(IncidentRepository incidents, IncidentFollowUpRepository followUps, MaintenanceOrderRepository orders,
                           VehicleRepository vehicles, ChargingPortRepository ports, ParkingSlotRepository slots, HubRepository hubs,
                           AppUserRepository users, ImpactService impact, AlertService alerts, NotificationService notifications,
                           FleetEvents events, JsonSupport json, Clock clock) {
        this.incidents = incidents;
        this.followUps = followUps;
        this.orders = orders;
        this.vehicles = vehicles;
        this.ports = ports;
        this.slots = slots;
        this.hubs = hubs;
        this.users = users;
        this.impact = impact;
        this.alerts = alerts;
        this.notifications = notifications;
        this.events = events;
        this.json = json;
        this.clock = clock;
    }

    @Transactional
    public ReportResult report(Long reporterId, ReportRequest r, IncidentSource source) {
        Long targetId = resolveTarget(r);
        Severity sev = Boolean.TRUE.equals(r.safetyCritical()) ? Severity.CRITICAL : defaultSeverity(r.category());
        return create(reporterId, r.hubId(), r.targetType(), targetId, r.category(), r.description(), r.photoUrls(), sev, source, r.tripId());
    }

    /** Sự cố do hệ thống tự tạo (mở khóa thất bại, thiết bị không phản hồi...). */
    @Transactional
    public ReportResult createSystem(Long hubId, TargetType type, Long targetId, String category, String description, Severity sev) {
        return create(null, hubId, type, targetId, category, description, null, sev, IncidentSource.SYSTEM, null);
    }

    private ReportResult create(Long reporterId, Long hubId, TargetType type, Long targetId, String category, String description,
                                List<String> photos, Severity sev, IncidentSource source, Long tripId) {
        if (!hubs.existsById(hubId)) throw BusinessException.notFound("Hub", hubId);
        String label = label(type, targetId);
        Optional<Incident> existing = incidents.findFirstByTargetTypeAndTargetIdAndStatusIn(type, targetId, OPEN);
        if (existing.isPresent()) {
            // E1: trùng lặp → liên kết phản hồi vào phiếu hiện có
            Incident inc = incidents.lockById(existing.get().getId()).orElseThrow();
            inc.addFollowUp();
            inc.escalate(sev);
            followUps.save(new IncidentFollowUp(inc.getId(), reporterId, description));
            if (sev == Severity.CRITICAL) flagResource(type, targetId, "Báo cáo an toàn nghiêm trọng");
            return new ReportResult(inc.getId(), inc.getCode(), true, label, inc.getStatus().name(),
                    "Sự cố đã được ghi nhận trước đó, phản hồi của bạn đã được liên kết vào phiếu " + inc.getCode());
        }
        Incident inc = incidents.saveAndFlush(new Incident(Codes.next("SC", clock.instant()), reporterId, hubId, type, targetId, category, sev,
                source, description, photos == null || photos.isEmpty() ? null : json.write(photos), tripId));
        flagResource(type, targetId, category);
        alerts.raise(AlertType.DEVICE_ERROR, hubId, type.name(), targetId,
                sev == Severity.CRITICAL || sev == Severity.HIGH ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                "Sự cố " + inc.getCode() + " – " + label + ": " + category);
        return new ReportResult(inc.getId(), inc.getCode(), false, label, inc.getStatus().name(),
                "Cảm ơn bạn! Phiếu sự cố " + inc.getCode() + " đã được chuyển tới Đơn vị vận hành");
    }

    /** MT01 bước 4: gắn cờ tạm thời để không phân bổ/cho đặt tài nguyên bị sự cố. */
    private void flagResource(TargetType type, Long id, String reason) {
        switch (type) {
            case VEHICLE -> vehicles.lockById(id).ifPresent(v -> {
                if (FLAGGABLE.contains(v.getStatus())) {
                    v.setStatus(VehicleStatus.FAULTY);
                    impact.onVehicleUnavailable(v, reason);
                    events.hubChanged(v.getHubId());
                }
            });
            case CHARGING_PORT -> ports.lockById(id).ifPresent(p -> {
                if (p.getStatus() == PortStatus.AVAILABLE || p.getStatus() == PortStatus.PENDING_CHECK) {
                    p.setStatus(PortStatus.FAULTY);
                    impact.onPortUnavailable(p, reason);
                } else if (p.getStatus() == PortStatus.OCCUPIED) {
                    p.setErrorCode("REPORTED");
                }
                events.hubChanged(p.getHubId());
            });
            case PARKING_SLOT -> slots.lockById(id).ifPresent(s -> {
                if (s.getStatus() == SlotStatus.AVAILABLE || s.getStatus() == SlotStatus.PENDING_CHECK) s.setStatus(SlotStatus.FAULTY);
                events.hubChanged(s.getHubId());
            });
            case HUB -> { }
        }
    }

    @Transactional(readOnly = true)
    public List<IncidentView> queue(boolean openOnly) {
        List<Incident> list = openOnly ? incidents.findByStatusInOrderByIdDesc(OPEN) : incidents.findTop100ByOrderByIdDesc();
        return list.stream()
                .sorted(Comparator.comparing((Incident i) -> i.getStatus() == IncidentStatus.OPEN ? 0 : 1)
                        .thenComparing(i -> -i.getSeverity().ordinal())
                        .thenComparing(i -> -i.getFollowUps())
                        .thenComparing(Incident::getId))
                .map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public IncidentView get(Long id) {
        return view(incidents.findById(id).orElseThrow(() -> BusinessException.notFound("Phiếu sự cố", id)));
    }

    @Transactional(readOnly = true)
    public List<IncidentView> mine(Long reporterId) {
        return incidents.findByReporterIdOrderByIdDesc(reporterId).stream().map(this::view).toList();
    }

    @SuppressWarnings("unchecked")
    IncidentView view(Incident i) {
        String hubName = hubs.findById(i.getHubId()).map(Hub::getName).orElse("?");
        String reporter = i.getReporterId() == null ? "Hệ thống" : users.findById(i.getReporterId()).map(AppUser::getFullName).orElse("?");
        List<String> photos = i.getPhotoUrls() == null ? List.of() : (List<String>) json.read(i.getPhotoUrls(), List.class);
        List<String> notes = followUps.findByIncidentIdOrderById(i.getId()).stream().map(IncidentFollowUp::getNote).filter(Objects::nonNull).toList();
        List<String> ords = orders.findByIncidentId(i.getId()).stream().map(MaintenanceOrder::getCode).collect(Collectors.toList());
        return new IncidentView(i.getId(), i.getCode(), i.getHubId(), hubName, i.getTargetType(), i.getTargetId(), label(i.getTargetType(), i.getTargetId()),
                i.getCategory(), i.getSeverity(), i.getSource(), i.getDescription(), photos, i.getStatus(), i.getFollowUps(), reporter,
                i.getCreatedAt(), notes, ords);
    }

    public String label(TargetType type, Long id) {
        return switch (type) {
            case VEHICLE -> vehicles.findById(id).map(v -> "Xe " + v.getCode()).orElse("Xe #" + id);
            case CHARGING_PORT -> ports.findById(id).map(p -> "Cổng sạc " + p.getCode()).orElse("Cổng #" + id);
            case PARKING_SLOT -> slots.findById(id).map(s -> "Ô đỗ " + s.getCode()).orElse("Ô #" + id);
            case HUB -> hubs.findById(id).map(Hub::getName).orElse("Hub #" + id);
        };
    }

    private Long resolveTarget(ReportRequest r) {
        if (r.targetId() != null) {
            boolean exists = switch (r.targetType()) {
                case VEHICLE -> vehicles.existsById(r.targetId());
                case CHARGING_PORT -> ports.existsById(r.targetId());
                case PARKING_SLOT -> slots.existsById(r.targetId());
                case HUB -> hubs.existsById(r.targetId());
            };
            if (!exists) throw new BusinessException(ErrorCode.NOT_FOUND, "Đối tượng gặp lỗi không tồn tại");
            return r.targetId();
        }
        if (r.targetCode() == null || r.targetCode().isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Vui lòng chọn đối tượng gặp lỗi", Map.of("targetCode", "Bắt buộc"));
        }
        String code = r.targetCode().trim().toUpperCase();
        return switch (r.targetType()) {
            case VEHICLE -> vehicles.findByCode(code).map(Vehicle::getId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy xe " + code));
            case CHARGING_PORT -> ports.findByHubIdOrderByCode(r.hubId()).stream().filter(p -> p.getCode().equalsIgnoreCase(code)).findFirst()
                    .map(ChargingPort::getId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy cổng sạc " + code));
            case PARKING_SLOT -> slots.findByHubIdAndCode(r.hubId(), code).map(ParkingSlot::getId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy ô đỗ " + code));
            case HUB -> r.hubId();
        };
    }

    private static Severity defaultSeverity(String category) {
        String c = category.toLowerCase();
        if (c.contains("phanh") || c.contains("an toàn") || c.contains("cháy") || c.contains("điện giật")) return Severity.HIGH;
        if (c.contains("không sạc") || c.contains("không mở") || c.contains("khóa")) return Severity.MEDIUM;
        return Severity.LOW;
    }

    public Instant now() { return clock.instant(); }

    public NotificationService notifications() { return notifications; }
}
