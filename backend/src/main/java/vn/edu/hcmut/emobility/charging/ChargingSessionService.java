package vn.edu.hcmut.emobility.charging;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.iot.CommandType;
import vn.edu.hcmut.emobility.core.iot.DeviceCommandService;
import vn.edu.hcmut.emobility.core.iot.DeviceType;
import vn.edu.hcmut.emobility.fleet.FleetEvents;
import vn.edu.hcmut.emobility.fleet.ResourceVerifier;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.hub.PortStatus;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;
import vn.edu.hcmut.emobility.personal.PortReservationService;
import vn.edu.hcmut.emobility.personal.PortReservationSource;
import vn.edu.hcmut.emobility.personal.PortReservationStatus;

/**
 * Phiên sạc THỰC TẾ cho đội xe dùng chung (góp ý #11):
 * mục lịch SCHEDULED → xe cắm vào ĐÚNG cổng (cảm biến) → gửi START_CHARGE → thiết bị xác nhận cấp điện
 * → phiên ACTIVE, xe CHARGING. Không có xác nhận thì xe KHÔNG bao giờ ở trạng thái Charging.
 */
@Service
public class ChargingSessionService {

    private static final Logger log = LoggerFactory.getLogger(ChargingSessionService.class);
    static final Set<SessionStatus> LIVE = Set.of(SessionStatus.STARTING, SessionStatus.ACTIVE, SessionStatus.STOPPING);
    private static final Set<VehicleStatus> CHARGEABLE = Set.of(VehicleStatus.NEEDS_CHARGE, VehicleStatus.AVAILABLE, VehicleStatus.PENDING_CHECK);

    public record PlugResult(boolean started, String message, Long sessionId) {}

    private final ChargingSessionRepository sessions;
    private final ChargingScheduleItemRepository items;
    private final VehicleRepository vehicles;
    private final ChargingPortRepository ports;
    private final PortReservationService portReservations;
    private final DeviceCommandService commands;
    private final ResourceVerifier verifier;
    private final AlertService alerts;
    private final FleetEvents events;
    private final AuditService audit;
    private final TxRunner tx;
    private final Clock clock;

    public ChargingSessionService(ChargingSessionRepository sessions, ChargingScheduleItemRepository items, VehicleRepository vehicles,
                                  ChargingPortRepository ports, PortReservationService portReservations, DeviceCommandService commands,
                                  ResourceVerifier verifier, AlertService alerts, FleetEvents events, AuditService audit, TxRunner tx, Clock clock) {
        this.sessions = sessions;
        this.items = items;
        this.vehicles = vehicles;
        this.ports = ports;
        this.portReservations = portReservations;
        this.commands = commands;
        this.verifier = verifier;
        this.alerts = alerts;
        this.events = events;
        this.audit = audit;
        this.tx = tx;
        this.clock = clock;
    }

    /** Cảm biến báo xe dùng chung đã cắm vào cổng. */
    public PlugResult onPlugged(Long portId, Long vehicleId) {
        record Prep(Long sessionId, String message) {}
        Prep p = tx.inNewTx(() -> {
            Instant now = clock.instant();
            ChargingPort port = ports.lockById(portId).orElseThrow(() -> BusinessException.notFound("Cổng sạc", portId));
            Vehicle v = vehicles.lockById(vehicleId).orElseThrow(() -> BusinessException.notFound("Xe", vehicleId));
            List<ChargingScheduleItem> planned = items.confirmedScheduledFor(vehicleId, now.minusSeconds(900), now.plusSeconds(900));
            if (planned.isEmpty()) return new Prep(null, "Xe " + v.getCode() + " không có lịch sạc đã xác nhận trong khung giờ này");
            ChargingScheduleItem item = planned.get(0);
            if (!item.getPortId().equals(portId)) {
                alerts.raise(AlertType.CHARGING_CONFLICT, port.getHubId(), "VEHICLE", vehicleId, AlertSeverity.WARNING,
                        "Xe " + v.getCode() + " cắm sai cổng " + port.getCode() + " (lịch: cổng #" + item.getPortId() + ")");
                return new Prep(null, "Xe cắm sai cổng – không bắt đầu phiên sạc");
            }
            if (port.getStatus() != PortStatus.AVAILABLE || !CHARGEABLE.contains(v.getStatus())) {
                return new Prep(null, "Cổng hoặc xe không ở trạng thái cho phép sạc");
            }
            ChargingSession s = sessions.saveAndFlush(new ChargingSession(portId, vehicleId, null, item.getId(), now, v.getBatteryPercent()));
            return new Prep(s.getId(), null);
        });
        if (p.sessionId() == null) return new PlugResult(false, p.message(), null);
        DeviceCommandService.Result res = commands.execute(DeviceType.PORT, portId, CommandType.START_CHARGE, "SESSION", p.sessionId());
        return tx.inNewTx(() -> {
            ChargingSession s = sessions.lockById(p.sessionId()).orElseThrow();
            if (!res.ok()) {
                s.fail();
                alerts.raise(AlertType.DEVICE_ERROR, ports.findById(portId).map(ChargingPort::getHubId).orElse(null), "PORT", portId,
                        AlertSeverity.WARNING, "Cổng #" + portId + " không xác nhận cấp điện – xe giữ nguyên trạng thái chờ sạc");
                return new PlugResult(false, "Thiết bị chưa xác nhận cấp điện – lịch vẫn giữ, xe chưa chuyển sang Đang sạc", s.getId());
            }
            Instant now = clock.instant();
            s.confirmPowerOn(now);
            ChargingPort port = ports.lockById(portId).orElseThrow();
            port.setStatus(PortStatus.OCCUPIED);
            Vehicle v = vehicles.lockById(vehicleId).orElseThrow();
            v.setStatus(VehicleStatus.CHARGING);
            items.lockById(s.getScheduleItemId()).ifPresent(i -> i.attachSession(s.getId()));
            events.hubChanged(port.getHubId());
            audit.record(null, "CHARGING_STARTED", "SESSION", s.getId(), Map.of("vehicle", v.getCode(), "port", port.getCode()));
            return new PlugResult(true, "Thiết bị xác nhận cấp điện – phiên sạc bắt đầu", s.getId());
        });
    }

    /** Dừng phiên sạc đội xe (đủ pin, hết khung giờ, rút cáp, hoặc Operator dừng). */
    public boolean stopFleetSession(Long sessionId, String reason) {
        Long portId = tx.inNewTx(() -> {
            ChargingSession s = sessions.lockById(sessionId).orElse(null);
            if (s == null || s.getStatus() != SessionStatus.ACTIVE || s.getVehicleId() == null) return null;
            s.stopping();
            return s.getPortId();
        });
        if (portId == null) return false;
        DeviceCommandService.Result res = commands.execute(DeviceType.PORT, portId, CommandType.STOP_CHARGE, "SESSION", sessionId);
        if (!res.ok()) {
            tx.runInNewTx(() -> alerts.raise(AlertType.DEVICE_ERROR, ports.findById(portId).map(ChargingPort::getHubId).orElse(null), "PORT", portId,
                    AlertSeverity.CRITICAL, "Cổng #" + portId + " chưa xác nhận ngắt điện – phiên sạc #" + sessionId + " giữ trạng thái đang dừng"));
            return false;
        }
        Long vehicleId = tx.inNewTx(() -> {
            ChargingSession s = sessions.lockById(sessionId).orElseThrow();
            Instant now = clock.instant();
            Vehicle v = vehicles.lockById(s.getVehicleId()).orElseThrow();
            ChargingPort port = ports.lockById(s.getPortId()).orElseThrow();
            double hours = s.getStartedAt() == null ? 0 : Duration.between(s.getStartedAt(), now).toSeconds() / 3600.0;
            s.complete(now, Math.min(v.getBatteryCapacityKwh(), port.getPowerKw() * hours * 0.9), v.getBatteryPercent());
            port.setStatus(PortStatus.PENDING_CHECK);
            if (v.getStatus() == VehicleStatus.CHARGING) v.setStatus(VehicleStatus.PENDING_CHECK);
            if (s.getScheduleItemId() != null) {
                items.lockById(s.getScheduleItemId()).ifPresent(i -> i.setStatus(ScheduleItemStatus.COMPLETED));
                portReservations.release(PortReservationSource.SCHEDULE_ITEM, s.getScheduleItemId(), PortReservationStatus.RELEASED);
            }
            events.hubChanged(port.getHubId());
            audit.record(null, "CHARGING_STOPPED", "SESSION", s.getId(), Map.of("reason", reason));
            return v.getId();
        });
        safe(() -> verifier.verifyVehicle(vehicleId));
        safe(() -> verifier.verifyPort(portId));
        return true;
    }

    /** Dữ liệu pin: dừng khi đạt mục tiêu của mục lịch. */
    public void onBatteryReported(Long vehicleId, int battery) {
        Long toStop = tx.inNewTx(() -> sessions.findFirstByVehicleIdAndStatusIn(vehicleId, Set.of(SessionStatus.ACTIVE))
                .filter(s -> s.getScheduleItemId() != null)
                .filter(s -> items.findById(s.getScheduleItemId()).map(i -> battery >= i.getTargetBattery()).orElse(battery >= 95))
                .map(ChargingSession::getId).orElse(null));
        if (toStop != null) stopFleetSession(toStop, "Đạt mức pin mục tiêu");
    }

    public List<Long> activeFleetSessionsPastWindow() {
        Instant now = clock.instant();
        return tx.inNewTx(() -> sessions.findByStatus(SessionStatus.ACTIVE).stream()
                .filter(s -> s.getScheduleItemId() != null)
                .filter(s -> items.findById(s.getScheduleItemId()).map(i -> i.getEndAt().isBefore(now)).orElse(false))
                .map(ChargingSession::getId).toList());
    }

    private void safe(Runnable r) {
        try {
            tx.runInNewTx(r);
        } catch (RuntimeException e) {
            log.warn("Xác minh sau phiên sạc thất bại: {}", e.getMessage());
        }
    }

    public static void requireNotLive(ChargingScheduleItem item) {
        if (item.getStatus() == ScheduleItemStatus.ACTIVE) throw new BusinessException(ErrorCode.SESSION_IN_PROGRESS);
    }
}
