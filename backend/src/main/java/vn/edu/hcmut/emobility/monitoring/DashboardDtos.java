package vn.edu.hcmut.emobility.monitoring;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import vn.edu.hcmut.emobility.hub.HubDtos.HubSummary;

public final class DashboardDtos {
    private DashboardDtos() {}

    public record AlertView(Long id, AlertType type, Long hubId, String hubName, String resourceType, Long resourceId,
                            AlertSeverity severity, AlertStatus status, String message, Instant createdAt) {}

    public record HubRow(HubSummary hub, int occupancyPercent, int portUsagePercent, String loadLevel, long openAlerts,
                         boolean disconnected, Map<String, Long> vehiclesByStatus) {}

    public record Totals(long activeHubs, long totalHubs, long disconnectedHubs, long totalVehicles, long availableVehicles,
                         long inUse, long charging, long pendingCheck, long faulty, long other,
                         int avgOccupancyPercent, long hubsOverThreshold, long portsInUse, long portsTotal, long portsFaulty) {}

    public record Overview(Totals totals, List<HubRow> hubs, List<AlertView> alerts, Instant servedAt, int refreshSeconds) {}

    public record VehicleRow(Long id, String code, String type, String model, int batteryPercent, double rangeKm, String status,
                             String slotCode, String lockState, Instant lastSeenAt, String errorCode, Double rating) {}

    public record SlotRow(Long id, String code, String kind, String status, String vehicleCode, String bookingCode) {}

    public record PortRow(Long id, String code, double powerKw, String connectorType, String status, boolean disableAfterSession,
                          String chargingWhat, String errorCode) {}

    public record HubDetail(HubSummary hub, List<VehicleRow> vehicles, List<SlotRow> slots, List<PortRow> ports,
                            List<AlertView> alerts, boolean stale, Instant lastSyncAt) {}
}
