package vn.edu.hcmut.emobility.iot;

import java.time.Clock;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.edu.hcmut.emobility.charging.ChargingSessionRepository;
import vn.edu.hcmut.emobility.charging.SessionStatus;
import vn.edu.hcmut.emobility.core.common.TxRunner;
import vn.edu.hcmut.emobility.core.iot.LockState;
import vn.edu.hcmut.emobility.core.iot.SimulatedIotGateway;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.ChargingPortRepository;
import vn.edu.hcmut.emobility.hub.Hub;
import vn.edu.hcmut.emobility.hub.HubRepository;
import vn.edu.hcmut.emobility.hub.HubStatus;

/**
 * Thiết bị GIẢ LẬP cho MVP (dữ liệu trạng thái được giả lập – mục 1.3): định kỳ gửi nhịp tim Hub,
 * trừ pin xe đang chạy, cộng pin xe đang sạc (chỉ khi phiên sạc ACTIVE), phản ánh trạng thái khóa vật lý.
 */
@Component
@ConditionalOnProperty(name = "app.iot.mode", havingValue = "simulated", matchIfMissing = true)
public class DeviceSimulator {

    private static final Logger log = LoggerFactory.getLogger(DeviceSimulator.class);

    private final HubRepository hubs;
    private final VehicleRepository vehicles;
    private final ChargingPortRepository ports;
    private final ChargingSessionRepository sessions;
    private final TelemetryService telemetry;
    private final SimulatedIotGateway gateway;
    private final TxRunner tx;
    private final Clock clock;
    private final Set<Long> offlineHubs = ConcurrentHashMap.newKeySet();

    public DeviceSimulator(HubRepository hubs, VehicleRepository vehicles, ChargingPortRepository ports, ChargingSessionRepository sessions,
                           TelemetryService telemetry, SimulatedIotGateway gateway, TxRunner tx, Clock clock) {
        this.hubs = hubs;
        this.vehicles = vehicles;
        this.ports = ports;
        this.sessions = sessions;
        this.telemetry = telemetry;
        this.gateway = gateway;
        this.tx = tx;
        this.clock = clock;
    }

    public void tick() {
        List<Long> active = tx.inNewTx(() -> hubs.findByStatusOrderByName(HubStatus.ACTIVE).stream().map(Hub::getId).toList());
        for (Long hubId : active) {
            if (offlineHubs.contains(hubId)) continue;
            telemetry.hubHeartbeat(hubId);
        }
        record V(Long id, int battery, VehicleStatus status, Long hubId) {}
        List<V> moving = tx.inNewTx(() -> vehicles.findByStatusIn(Set.of(VehicleStatus.IN_USE, VehicleStatus.CHARGING,
                VehicleStatus.RETURN_RECONCILING, VehicleStatus.UNLOCK_RECONCILING)).stream()
                .map(v -> new V(v.getId(), v.getBatteryPercent(), v.getStatus(), v.getHubId())).toList());
        Map<Long, Double> portPower = new HashMap<>();
        tx.runInNewTx(() -> sessions.findByStatus(SessionStatus.ACTIVE).forEach(s -> {
            if (s.getVehicleId() != null) portPower.put(s.getVehicleId(), ports.findById(s.getPortId()).map(p -> p.getPowerKw()).orElse(3.3));
        }));
        for (V v : moving) {
            if (v.hubId() != null && offlineHubs.contains(v.hubId())) continue;
            try {
                LockState lock = gateway.lockOf(v.id());
                switch (v.status()) {
                    case IN_USE -> telemetry.ingest(TelemetryMessage.vehicle(v.id(), null, Math.max(5, v.battery() - 1), lock, 0.25), false);
                    case CHARGING -> {
                        // Chỉ cộng pin khi có phiên sạc ACTIVE (thiết bị đã xác nhận cấp điện)
                        double kw = portPower.getOrDefault(v.id(), 0.0);
                        int inc = kw <= 0 ? 0 : (int) Math.max(2, Math.round(kw * 1.5));
                        telemetry.ingest(TelemetryMessage.vehicle(v.id(), null, Math.min(100, v.battery() + inc), lock, null), false);
                    }
                    default -> telemetry.ingest(TelemetryMessage.vehicle(v.id(), null, v.battery(), lock, null), false);
                }
            } catch (RuntimeException e) {
                log.debug("Giả lập xe {} lỗi: {}", v.id(), e.getMessage());
            }
        }
    }

    public void setHubOffline(Long hubId, boolean offline) {
        if (offline) offlineHubs.add(hubId); else offlineHubs.remove(hubId);
    }

    public Set<Long> offlineHubs() { return Set.copyOf(offlineHubs); }
}
