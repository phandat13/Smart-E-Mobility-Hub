package vn.edu.hcmut.emobility.simulation;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Mô hình dữ liệu của mô phỏng – độc lập hoàn toàn với entity vận hành (snapshot tách biệt). */
public final class SimModel {
    private SimModel() {}

    public record HubState(long id, String code, String name, String type, double lat, double lng, int sharedCapacity,
                           int occupiedSlots, int heldSlots, int availableVehicles, int lowBatteryVehicles, int totalVehicles,
                           int workingPorts, int totalPorts, int avgBattery) {}

    public record Snapshot(Instant takenAt, List<HubState> hubs, int vehiclesInUse) {}

    public record TransferPlan(long fromHubId, long toHubId, int count) {}

    public record Params(List<Long> hubIds, int demandIncreasePct, int startHour, int failedPortPct, int failedVehicleCount,
                         List<TransferPlan> transfers, int extraPorts) {}

    public record HubMetrics(long hubId, String name, double requested, double served, double unmet, int serviceRatePct,
                             int shortageVehicles, int peakOccupancyPct, boolean overloadRisk, double redirected,
                             int minAvailable, int endAvailable, int endLowBattery) {}

    public record SeriesPoint(int minute, Map<String, Integer> occupancyPct) {}

    public record Suggestion(String type, Map<String, Object> payload, String rationale) {}

    public record Result(int serviceRatePct, double requested, double served, double unmet, int hubsAtRisk, int totalShortage,
                         List<HubMetrics> hubs, List<SeriesPoint> series, List<Suggestion> recommendations, String summary) {}
}
