package vn.edu.hcmut.emobility.rebalance;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class TransferDtos {
    private TransferDtos() {}

    public record CreateTransferRequest(@NotNull Long sourceHubId, @NotNull Long targetHubId,
                                        @NotEmpty @Size(max = 30) List<Long> vehicleIds, Long alertId, @Size(max = 255) String note) {}

    public record ItemView(Long id, Long vehicleId, String vehicleCode, int batteryPercent, TransferItemStatus status,
                           String heldSlotCode, String deliveredHubName, Instant loadedAt, Instant deliveredAt, String note) {}

    public record OrderView(Long id, String code, Long sourceHubId, String sourceHubName, Long targetHubId, String targetHubName,
                            Long driverId, String driverName, TransferOrderStatus status, TransferStatusPolicy.Counts counts,
                            Instant createdAt, Instant startedAt, Instant completedAt, Long alertId, Long recommendationId,
                            String note, List<ItemView> items, String message) {}

    public record CandidateView(Long id, String code, String type, int batteryPercent, String status) {}

    public record ScanRequest(@NotBlank @Size(max = 20) String vehicleCode) {}

    public record BrokenRequest(@NotBlank @Size(max = 20) String vehicleCode, @NotBlank @Size(max = 500) String note) {}

    public record RerouteRequest(@NotNull Long newTargetHubId, @NotBlank @Size(max = 255) String reason) {}

    public record DriverView(Long id, Long userId, String fullName, String status, String truckPlate, int capacity) {}
}
