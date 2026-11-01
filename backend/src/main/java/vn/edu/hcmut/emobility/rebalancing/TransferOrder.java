package vn.edu.hcmut.emobility.rebalancing;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "transfer_order")
public class TransferOrder extends BaseEntity {

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "source_hub_id", nullable = false)
    private Long sourceHubId;

    @Column(name = "target_hub_id", nullable = false)
    private Long targetHubId;

    @Column(name = "driver_id")
    private Long driverId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransferOrderStatus status;

    /** Cảnh báo mất cân đối (IMBALANCE) sinh ra lệnh này, nếu có. */
    @Column(name = "alert_id")
    private Long alertId;

    /** Gợi ý từ module mô phỏng (SI) sinh ra lệnh này, nếu có. */
    @Column(name = "recommendation_id")
    private Long recommendationId;

    protected TransferOrder() {}

    public static TransferOrder create(String code, Long sourceHubId, Long targetHubId,
                                       Long alertId, Long recommendationId) {
        TransferOrder o = new TransferOrder();
        o.code = code;
        o.sourceHubId = sourceHubId;
        o.targetHubId = targetHubId;
        o.alertId = alertId;
        o.recommendationId = recommendationId;
        o.status = TransferOrderStatus.PENDING;
        return o;
    }

    public void assignTo(Long driverId) {
        this.driverId = driverId;
        this.status = TransferOrderStatus.ASSIGNED;
    }

    public void start() {
        if (status == TransferOrderStatus.ASSIGNED) status = TransferOrderStatus.IN_PROGRESS;
    }

    public void complete() { status = TransferOrderStatus.COMPLETED; }
    public void cancel() { status = TransferOrderStatus.CANCELLED; }

    public String getCode() { return code; }
    public Long getSourceHubId() { return sourceHubId; }
    public Long getTargetHubId() { return targetHubId; }
    public Long getDriverId() { return driverId; }
    public TransferOrderStatus getStatus() { return status; }
    public Long getAlertId() { return alertId; }
    public Long getRecommendationId() { return recommendationId; }
}
