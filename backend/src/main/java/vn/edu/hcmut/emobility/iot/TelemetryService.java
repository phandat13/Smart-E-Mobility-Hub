package vn.edu.hcmut.emobility.iot;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import vn.edu.hcmut.emobility.charging.ChargingSessionRepository;
import vn.edu.hcmut.emobility.charging.ChargingSessionService;
import vn.edu.hcmut.emobility.charging.SessionStatus;
import vn.edu.hcmut.emobility.core.common.JsonSupport;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.iot.DeviceType;
import vn.edu.hcmut.emobility.fleet.FleetEvents;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.monitoring.AlertService;
import vn.edu.hcmut.emobility.monitoring.AlertSeverity;
import vn.edu.hcmut.emobility.monitoring.AlertType;
import vn.edu.hcmut.emobility.personal.CheckInService;
import vn.edu.hcmut.emobility.rental.TripService;

/**
 * Mục 2.3 – tiếp nhận và cập nhật dữ liệu trạng thái từ thiết bị; phát sự kiện để giao diện cập nhật ≤ 2 giây.
 * Các phản ứng nghiệp vụ (bắt đầu/dừng phiên sạc, kết thúc check-out) chạy SAU khi commit dữ liệu cảm biến.
 */
@Service
public class TelemetryService {

    private static final Logger log = LoggerFactory.getLogger(TelemetryService.class);

    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final HubRepository hubs;
    private final TelemetryRecordRepository records;
    private final ChargingSessionRepository sessions;
    private final ChargingSessionService chargingSessions;
    private final CheckInService checkIn;
    private final TripService trips;
    private final AlertService alerts;
    private final FleetEvents events;
    private final JsonSupport json;
    private final TxRunner tx;
    private final Clock clock;

    public TelemetryService(VehicleRepository vehicles, ParkingSlotRepository slots, ChargingPortRepository ports, HubRepository hubs,
                            TelemetryRecordRepository records, ChargingSessionRepository sessions, ChargingSessionService chargingSessions,
                            CheckInService checkIn, TripService trips, AlertService alerts, FleetEvents events, JsonSupport json,
                            TxRunner tx, Clock clock) {
        this.vehicles = vehicles;
        this.slots = slots;
        this.ports = ports;
        this.hubs = hubs;
        this.records = records;
        this.sessions = sessions;
        this.chargingSessions = chargingSessions;
        this.checkIn = checkIn;
        this.trips = trips;
        this.alerts = alerts;
        this.events = events;
        this.json = json;
        this.tx = tx;
        this.clock = clock;
    }

    public void ingest(TelemetryMessage m, boolean persist) {
        List<Runnable> after = new ArrayList<>();
        tx.runInNewTx(() -> {
            Instant now = clock.instant();
            if (persist) records.save(new TelemetryRecord(m.deviceType().name(), m.deviceId(), json.write(m), now));
            switch (m.deviceType()) {
                case VEHICLE -> vehicle(m, now, after);
                case SLOT -> slot(m, now, after);
                case PORT -> port(m, now, after);
            }
        });
        for (Runnable r : after) {
            try {
                r.run();
            } catch (RuntimeException e) {
                log.warn("Xử lý sau telemetry thất bại: {}", e.getMessage());
            }
        }
    }

    private void vehicle(TelemetryMessage m, Instant now, List<Runnable> after) {
        Vehicle v = vehicles.lockById(m.deviceId()).orElse(null);
        if (v == null) return;
        if (m.batteryPercent() != null) v.reportBattery(m.batteryPercent(), now); else v.seen(now);
        if (m.lockState() != null) v.setLockState(m.lockState());
        if (m.errorCode() != null && !m.errorCode().isBlank()) v.setErrorCode(m.errorCode());
        if (Boolean.TRUE.equals(m.clearError())) v.setErrorCode(null);
        if (m.hubId() != null && v.getStatus() != VehicleStatus.IN_TRANSIT) v.setHubId(m.hubId());
        if (m.distanceKm() != null && m.distanceKm() > 0) {
            v.addDistance(m.distanceKm());
            if (v.getStatus() == VehicleStatus.IN_USE) trips.addDistance(v.getId(), m.distanceKm());
        }
        if (v.getHubId() != null) hubs.touch(v.getHubId(), now);
        if (v.getStatus() == VehicleStatus.CHARGING && m.batteryPercent() != null) {
            int b = m.batteryPercent();
            after.add(() -> chargingSessions.onBatteryReported(v.getId(), b));
        }
        events.hubChanged(v.getHubId());
    }

    private void slot(TelemetryMessage m, Instant now, List<Runnable> after) {
        ParkingSlot s = slots.lockById(m.deviceId()).orElse(null);
        if (s == null) return;
        s.seen(now);
        hubs.touch(s.getHubId(), now);
        if (Boolean.TRUE.equals(m.occupied())) {
            if (s.getKind() == SlotKind.SHARED && m.vehicleId() != null) {
                if (s.getStatus() == SlotStatus.HELD) {
                    alerts.raise(AlertType.CAPACITY_CONFLICT, s.getHubId(), "SLOT", s.getId(), AlertSeverity.WARNING,
                            "Có xe đỗ vào ô " + s.getCode() + " đang giữ cho xe điều chuyển – không ghi nhận là vị trí trả hợp lệ");
                    return;
                }
                if (s.getStatus() == SlotStatus.FAULTY || s.getStatus() == SlotStatus.DISABLED) return;
                slots.lockByVehicleId(m.vehicleId()).filter(o -> !o.getId().equals(s.getId())).ifPresent(ParkingSlot::vacate);
                s.occupy(m.vehicleId());
                vehicles.lockById(m.vehicleId()).ifPresent(v -> {
                    v.setHubId(s.getHubId());
                    v.seen(now);
                });
            } else if (s.getKind() == SlotKind.PERSONAL) {
                s.setStatus(SlotStatus.OCCUPIED);
            }
        } else if (Boolean.FALSE.equals(m.occupied())) {
            Long sid = s.getId();
            boolean personal = s.getKind() == SlotKind.PERSONAL;
            s.vacate();
            if (personal && s.getStatus() == SlotStatus.OCCUPIED) s.setStatus(SlotStatus.PENDING_CHECK);
            if (personal) after.add(() -> checkIn.onResourceVacated(sid, null));
        }
        events.hubChanged(s.getHubId());
    }

    private void port(TelemetryMessage m, Instant now, List<Runnable> after) {
        ChargingPort p = ports.lockById(m.deviceId()).orElse(null);
        if (p == null) return;
        p.seen(now);
        hubs.touch(p.getHubId(), now);
        if (m.errorCode() != null && !m.errorCode().isBlank()) p.setErrorCode(m.errorCode());
        if (Boolean.TRUE.equals(m.clearError())) p.setErrorCode(null);
        Long pid = p.getId();
        if (m.vehicleId() != null && !Boolean.TRUE.equals(m.unplugged())) {
            Long vid = m.vehicleId();
            after.add(() -> chargingSessions.onPlugged(pid, vid));
        }
        if (Boolean.TRUE.equals(m.unplugged())) {
            sessions.findFirstByPortIdAndStatusIn(pid, java.util.Set.of(SessionStatus.ACTIVE)).ifPresent(s -> {
                if (s.getVehicleId() != null) {
                    Long sessionId = s.getId();
                    after.add(() -> chargingSessions.stopFleetSession(sessionId, "Rút cáp sạc"));
                }
            });
            after.add(() -> checkIn.onResourceVacated(null, pid));
        }
        events.hubChanged(p.getHubId());
    }

    /** Nhịp tim cả Hub (bộ điều khiển Hub báo còn kết nối). */
    public void hubHeartbeat(Long hubId) {
        tx.runInNewTx(() -> {
            Instant now = clock.instant();
            hubs.touch(hubId, now);
            slots.heartbeat(hubId, now);
            ports.heartbeat(hubId, now);
            vehicles.heartbeat(hubId, now);
        });
    }

    public Map<String, Object> ack(TelemetryMessage m) {
        return Map.of("accepted", true, "deviceType", m.deviceType().name(), "deviceId", m.deviceId(), "receivedAt", clock.instant().toString());
    }

    public DeviceType type(String s) { return DeviceType.valueOf(s); }
}
