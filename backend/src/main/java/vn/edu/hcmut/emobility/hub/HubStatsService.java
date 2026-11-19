package vn.edu.hcmut.emobility.hub;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.fleet.VehicleRepository;
import vn.edu.hcmut.emobility.fleet.VehicleStatus;
import vn.edu.hcmut.emobility.hub.HubDtos.HubSummary;

/** Tính chỉ số tổng hợp từng Hub bằng truy vấn gom nhóm (dùng cho AC01, MO01, WebSocket). */
@Service
public class HubStatsService {

    /** Bộ đếm thô của một Hub. */
    public static final class Counters {
        public long available, total, sumBatteryAvailable, sharedFree, sharedTotal, sharedOccupied, sharedHeld,
                personalFree, personalTotal, portsFree, portsTotal, portsFaulty, portsBusy;
        public final Map<VehicleStatus, Long> byStatus = new HashMap<>();
    }

    private final HubRepository hubs;
    private final VehicleRepository vehicles;
    private final ParkingSlotRepository slots;
    private final ChargingPortRepository ports;
    private final AppProperties props;
    private final Clock clock;

    public HubStatsService(HubRepository hubs, VehicleRepository vehicles, ParkingSlotRepository slots,
                           ChargingPortRepository ports, AppProperties props, Clock clock) {
        this.hubs = hubs;
        this.vehicles = vehicles;
        this.slots = slots;
        this.ports = ports;
        this.props = props;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Map<Long, Counters> countersByHub() {
        Map<Long, Counters> map = new HashMap<>();
        for (Object[] r : vehicles.countGrouped()) {
            Counters c = map.computeIfAbsent((Long) r[0], k -> new Counters());
            VehicleStatus st = (VehicleStatus) r[1];
            long n = ((Number) r[2]).longValue();
            c.total += n;
            c.byStatus.merge(st, n, Long::sum);
            if (st == VehicleStatus.AVAILABLE) {
                c.available += n;
                c.sumBatteryAvailable += Math.round(((Number) r[3]).doubleValue() * n);
            }
        }
        for (Object[] r : slots.countGrouped()) {
            Counters c = map.computeIfAbsent((Long) r[0], k -> new Counters());
            SlotKind kind = (SlotKind) r[1];
            SlotStatus st = (SlotStatus) r[2];
            long n = ((Number) r[3]).longValue();
            if (st == SlotStatus.DISABLED) continue;
            if (kind == SlotKind.SHARED) {
                c.sharedTotal += n;
                if (st == SlotStatus.AVAILABLE) c.sharedFree += n;
                if (st == SlotStatus.OCCUPIED) c.sharedOccupied += n;
                if (st == SlotStatus.HELD) c.sharedHeld += n;
            } else {
                c.personalTotal += n;
                if (st == SlotStatus.AVAILABLE) c.personalFree += n;
            }
        }
        for (Object[] r : ports.countGrouped()) {
            Counters c = map.computeIfAbsent((Long) r[0], k -> new Counters());
            PortStatus st = (PortStatus) r[1];
            long n = ((Number) r[2]).longValue();
            if (st == PortStatus.DISABLED) continue;
            c.portsTotal += n;
            if (st == PortStatus.AVAILABLE) c.portsFree += n;
            if (st == PortStatus.OCCUPIED) c.portsBusy += n;
            if (st == PortStatus.FAULTY || st == PortStatus.MAINTENANCE) c.portsFaulty += n;
        }
        return map;
    }

    public boolean isStale(Hub h, Instant now) {
        if (h.getLastSyncAt() == null) return true;
        long limit = (long) props.iot().telemetryIntervalSeconds() * props.hub().offlineAfterMissedCycles();
        return Duration.between(h.getLastSyncAt(), now).getSeconds() > limit;
    }

    public HubSummary summary(Hub h, Counters c) {
        Instant now = clock.instant();
        if (c == null) c = new Counters();
        Integer avg = c.available == 0 ? null : (int) Math.round((double) c.sumBatteryAvailable / c.available);
        return new HubSummary(h.getId(), h.getCode(), h.getName(), h.getAddress(), h.getArea(), h.getType(), h.getStatus(),
                h.getLatitude(), h.getLongitude(), c.available, avg, c.total, c.sharedFree, c.sharedTotal,
                c.personalFree, c.personalTotal, c.portsFree, c.portsTotal, c.portsFaulty,
                h.getLastSyncAt(), isStale(h, now), now);
    }

    @Transactional(readOnly = true)
    public List<HubSummary> all(boolean activeOnly) {
        Map<Long, Counters> c = countersByHub();
        List<Hub> list = activeOnly ? hubs.findByStatusOrderByName(HubStatus.ACTIVE) : hubs.findAllByOrderByName();
        return list.stream().map(h -> summary(h, c.get(h.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public HubSummary one(Long hubId) {
        Hub h = hubs.findById(hubId).orElseThrow(() -> vn.edu.hcmut.emobility.core.exception.BusinessException.notFound("Hub", hubId));
        return summary(h, countersByHub().get(hubId));
    }
}
