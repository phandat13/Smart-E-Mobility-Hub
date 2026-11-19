package vn.edu.hcmut.emobility.fleet;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.charging.ChargingSessionRepository;
import vn.edu.hcmut.emobility.charging.SessionStatus;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.hub.ParkingSlot;
import vn.edu.hcmut.emobility.hub.ParkingSlotRepository;
import vn.edu.hcmut.emobility.hub.PortStatus;
import vn.edu.hcmut.emobility.hub.SlotStatus;
import vn.edu.hcmut.emobility.maintenance.IncidentRepository;
import vn.edu.hcmut.emobility.maintenance.IncidentStatus;
import vn.edu.hcmut.emobility.maintenance.MaintenanceTicketRepository;
import vn.edu.hcmut.emobility.maintenance.TargetType;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;

/**
 * Mục 2.3 – Xác minh tài nguyên ở trạng thái "Chờ kiểm tra" trước khi đưa trở lại phục vụ.
 * Xe: dữ liệu cảm biến còn mới + không báo lỗi, đúng Hub, pin ≥ 20%, không còn sự cố/phiếu bảo trì mở.
 */
@Service
public class ResourceVerifier {

    private static final Set<IncidentStatus> OPEN_INCIDENT = Set.of(IncidentStatus.OPEN, IncidentStatus.ASSIGNED);
    private static final Set<SessionStatus> LIVE = Set.of(SessionStatus.STARTING, SessionStatus.ACTIVE, SessionStatus.STOPPING);

    public record Outcome(String resource, Long id, String result, String reason) {}

    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final IncidentRepository incidents;
    private final MaintenanceTicketRepository tickets;
    private final ChargingSessionRepository sessions;
    private final AlertService alerts;
    private final FleetEvents events;
    private final AppProperties props;
    private final Clock clock;

    public ResourceVerifier(VehicleRepository vehicles, ParkingSlotRepository slots, ChargingPortRepository ports,
                            IncidentRepository incidents, MaintenanceTicketRepository tickets, ChargingSessionRepository sessions,
                            AlertService alerts, FleetEvents events, AppProperties props, Clock clock) {
        this.vehicles = vehicles;
        this.slots = slots;
        this.ports = ports;
        this.incidents = incidents;
        this.tickets = tickets;
        this.sessions = sessions;
        this.alerts = alerts;
        this.events = events;
        this.props = props;
        this.clock = clock;
    }

    private boolean fresh(Instant seen, Instant now) {
        return seen != null && Duration.between(seen, now).getSeconds() <= 2L * props.iot().telemetryIntervalSeconds();
    }

    @Transactional
    public Outcome verifyVehicle(Long id) {
        Vehicle v = vehicles.lockById(id).orElse(null);
        if (v == null || v.getStatus() != VehicleStatus.PENDING_CHECK) {
            return new Outcome("VEHICLE", id, v == null ? "MISSING" : v.getStatus().name(), "Không ở trạng thái chờ kiểm tra");
        }
        Instant now = clock.instant();
        if (!fresh(v.getLastSeenAt(), now)) {
            alerts.raise(AlertType.OFFLINE, v.getHubId(), "VEHICLE", id, AlertSeverity.WARNING,
                    "Xe " + v.getCode() + " chưa gửi dữ liệu cảm biến – giữ trạng thái Chờ kiểm tra");
            return new Outcome("VEHICLE", id, "PENDING_CHECK", "Không có dữ liệu cảm biến mới");
        }
        alerts.resolveIfOpen(AlertType.OFFLINE, v.getHubId(), "VEHICLE", id);
        ParkingSlot slot = slots.findByVehicleId(id).orElse(null);
        boolean atHub = v.getHubId() != null && slot != null && slot.getHubId().equals(v.getHubId());
        boolean openIssue = incidents.existsByTargetTypeAndTargetIdAndStatusIn(TargetType.VEHICLE, id, OPEN_INCIDENT)
                || tickets.hasOpenTicket(TargetType.VEHICLE, id);
        if (v.getErrorCode() != null || openIssue || !atHub) {
            v.setStatus(VehicleStatus.FAULTY);
            String reason = v.getErrorCode() != null ? "Cảm biến báo lỗi " + v.getErrorCode()
                    : openIssue ? "Còn sự cố/phiếu bảo trì đang mở" : "Vị trí thực tế không khớp Hub ghi nhận";
            alerts.raise(AlertType.DEVICE_ERROR, v.getHubId(), "VEHICLE", id, AlertSeverity.WARNING, "Xe " + v.getCode() + ": " + reason);
            events.hubChanged(v.getHubId());
            return new Outcome("VEHICLE", id, "FAULTY", reason);
        }
        if (v.getBatteryPercent() < props.vehicle().minBatteryPercent()) {
            v.setStatus(VehicleStatus.NEEDS_CHARGE);
            events.hubChanged(v.getHubId());
            return new Outcome("VEHICLE", id, "NEEDS_CHARGE", "Pin " + v.getBatteryPercent() + "% dưới ngưỡng");
        }
        v.setStatus(VehicleStatus.AVAILABLE);
        events.hubChanged(v.getHubId());
        return new Outcome("VEHICLE", id, "AVAILABLE", "Đạt tất cả điều kiện");
    }

    @Transactional
    public Outcome verifySlot(Long id) {
        ParkingSlot s = slots.lockById(id).orElse(null);
        if (s == null || s.getStatus() != SlotStatus.PENDING_CHECK) return new Outcome("SLOT", id, s == null ? "MISSING" : s.getStatus().name(), "");
        if (!fresh(s.getLastSeenAt(), clock.instant())) return new Outcome("SLOT", id, "PENDING_CHECK", "Không có dữ liệu cảm biến mới");
        s.setStatus(s.getVehicleId() != null ? SlotStatus.OCCUPIED : SlotStatus.AVAILABLE);
        events.hubChanged(s.getHubId());
        return new Outcome("SLOT", id, s.getStatus().name(), "");
    }

    @Transactional
    public Outcome verifyPort(Long id) {
        ChargingPort p = ports.lockById(id).orElse(null);
        if (p == null || p.getStatus() != PortStatus.PENDING_CHECK) return new Outcome("PORT", id, p == null ? "MISSING" : p.getStatus().name(), "");
        if (!fresh(p.getLastSeenAt(), clock.instant())) return new Outcome("PORT", id, "PENDING_CHECK", "Không có dữ liệu cảm biến mới");
        if (p.getErrorCode() != null || incidents.existsByTargetTypeAndTargetIdAndStatusIn(TargetType.CHARGING_PORT, id, OPEN_INCIDENT)) {
            p.setStatus(PortStatus.FAULTY);
            alerts.raise(AlertType.DEVICE_ERROR, p.getHubId(), "PORT", id, AlertSeverity.WARNING, "Cổng " + p.getCode() + " báo lỗi khi xác minh");
        } else if (sessions.existsByPortIdAndStatusIn(id, LIVE)) {
            p.setStatus(PortStatus.OCCUPIED);
        } else if (p.isDisableAfterSession()) {
            p.setStatus(PortStatus.DISABLED);
        } else {
            p.setStatus(PortStatus.AVAILABLE);
        }
        events.hubChanged(p.getHubId());
        return new Outcome("PORT", id, p.getStatus().name(), "");
    }
}
