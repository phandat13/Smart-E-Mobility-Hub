package vn.edu.hcmut.emobility.module.rebalancing;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

/** Toàn bộ dữ liệu JSON vào/ra của module RB. */
public final class RebalancingDto {

    private RebalancingDto() {}

    public record CreateTransferRequest(@NotNull Long sourceHubId,
                                        @NotNull Long targetHubId,
                                        @NotEmpty List<@NotNull Long> vehicleIds,
                                        Long alertId,
                                        Long recommendationId) {}

    public record LoadVehicleRequest(@NotNull Long vehicleId) {}

    public record ItemResponse(Long vehicleId, TransferItem.Status status) {}

    public record TransferOrderResponse(Long id, String code, Long sourceHubId, Long targetHubId, Long driverId,
                                        TransferOrder.Status status, Long alertId, Long recommendationId,
                                        Instant createdAt, List<ItemResponse> items) {

        public static TransferOrderResponse of(TransferOrder o, List<TransferItem> items) {
            return new TransferOrderResponse(o.getId(), o.getCode(), o.getSourceHubId(), o.getTargetHubId(),
                    o.getDriverId(), o.getStatus(), o.getAlertId(), o.getRecommendationId(), o.getCreatedAt(),
                    items.stream().map(i -> new ItemResponse(i.getVehicleId(), i.getStatus())).toList());
        }
    }
}
