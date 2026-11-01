package vn.edu.hcmut.emobility.rebalancing;

import java.time.Instant;
import java.util.List;

public record TransferOrderResponse(Long id, String code, Long sourceHubId, Long targetHubId, Long driverId,
                                    TransferOrderStatus status, Long alertId, Long recommendationId,
                                    Instant createdAt, List<Item> items) {

    public record Item(Long vehicleId, TransferItemStatus status) {}

    public static TransferOrderResponse of(TransferOrder o, List<TransferItem> items) {
        return new TransferOrderResponse(o.getId(), o.getCode(), o.getSourceHubId(), o.getTargetHubId(),
                o.getDriverId(), o.getStatus(), o.getAlertId(), o.getRecommendationId(), o.getCreatedAt(),
                items.stream().map(i -> new Item(i.getVehicleId(), i.getStatus())).toList());
    }
}
