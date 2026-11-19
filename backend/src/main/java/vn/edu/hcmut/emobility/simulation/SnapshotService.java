package vn.edu.hcmut.emobility.simulation;

import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.fleet.Vehicle;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.*;
import vn.edu.hcmut.emobility.simulation.SimModel.HubState;
import vn.edu.hcmut.emobility.simulation.SimModel.Snapshot;

/** Chụp bản sao trạng thái mạng lưới (chỉ đọc) làm đầu vào cho SI03 và đối chiếu ở SI05. */
@Service
public class SnapshotService {

    private final HubRepository hubs;
    private final HubStatsService stats;
    private final VehicleRepository vehicles;
    private final AppProperties props;
    private final Clock clock;

    public SnapshotService(HubRepository hubs, HubStatsService stats, VehicleRepository vehicles, AppProperties props, Clock clock) {
        this.hubs = hubs;
        this.stats = stats;
        this.vehicles = vehicles;
        this.props = props;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Snapshot capture() {
        Map<Long, HubStatsService.Counters> c = stats.countersByHub();
        Map<Long, int[]> perHub = new HashMap<>(); // [available≥min, low, total, sumBattery]
        int inUse = 0;
        int min = props.vehicle().minBatteryPercent();
        for (Vehicle v : vehicles.findAll()) {
            if (v.getStatus() == VehicleStatus.IN_USE) inUse++;
            if (v.getHubId() == null || v.getStatus() == VehicleStatus.OUT_OF_SERVICE) continue;
            int[] a = perHub.computeIfAbsent(v.getHubId(), k -> new int[4]);
            a[2]++;
            a[3] += v.getBatteryPercent();
            if (v.getStatus() == VehicleStatus.AVAILABLE && v.getBatteryPercent() >= min) a[0]++;
            if (v.getStatus() == VehicleStatus.NEEDS_CHARGE || (v.getStatus() == VehicleStatus.AVAILABLE && v.getBatteryPercent() < min)) a[1]++;
        }
        List<HubState> list = new ArrayList<>();
        for (Hub h : hubs.findByStatusOrderByName(HubStatus.ACTIVE)) {
            HubStatsService.Counters k = c.getOrDefault(h.getId(), new HubStatsService.Counters());
            int[] a = perHub.getOrDefault(h.getId(), new int[4]);
            list.add(new HubState(h.getId(), h.getCode(), h.getName(), h.getType().name(), h.getLatitude(), h.getLongitude(),
                    (int) k.sharedTotal, (int) k.sharedOccupied, (int) k.sharedHeld, a[0], a[1], a[2],
                    (int) (k.portsTotal - k.portsFaulty), (int) k.portsTotal, a[2] == 0 ? 0 : a[3] / a[2]));
        }
        return new Snapshot(clock.instant(), list, inUse);
    }
}
