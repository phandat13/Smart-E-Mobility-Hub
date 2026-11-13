package vn.edu.hcmut.emobility.module.rebalancing;

import jakarta.persistence.*;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

/** Lệnh điều chuyển: chở một nhóm xe từ Hub nguồn sang Hub đích. Từng xe là một {@link TransferItem}. */
@Entity
@Table(name = "transfer_order")
public class TransferOrder extends BaseEntity {

    public enum Status {
        /** Chưa có tài xế rảnh, đang xếp hàng chờ. */
        PENDING,
        /** Đã giao cho tài xế, chưa chất xe nào. */
        ASSIGNED,
        /** Đã chất ít nhất 1 xe lên. */
        IN_PROGRESS,
        COMPLETED,
        CANCELLED;

        public static final Set<Status> ACTIVE = EnumSet.of(PENDING, ASSIGNED, IN_PROGRESS);
        public static final Set<Status> ON_ROAD = EnumSet.of(ASSIGNED, IN_PROGRESS);
    }

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
    private Status status;

    /** Cảnh báo mất cân đối (IMBALANCE) sinh ra lệnh này, nếu có. */
    @Column(name = "alert_id")
    private Long alertId;

    /** Gợi ý từ module mô phỏng (SI) sinh ra lệnh này, nếu có. */
    @Column(name = "recommendation_id")
    private Long recommendationId;

    protected TransferOrder() {}

    public static TransferOrder create(Long sourceHubId, Long targetHubId, Long alertId, Long recommendationId) {
        TransferOrder o = new TransferOrder();
        o.code = "TO" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        o.sourceHubId = sourceHubId;
        o.targetHubId = targetHubId;
        o.alertId = alertId;
        o.recommendationId = recommendationId;
        o.status = Status.PENDING;
        return o;
    }

    public void assignTo(Long driverId) {
        this.driverId = driverId;
        this.status = Status.ASSIGNED;
    }

    public void start() {
        if (status == Status.ASSIGNED) status = Status.IN_PROGRESS;
    }

    public void complete() { status = Status.COMPLETED; }
    public void cancel() { status = Status.CANCELLED; }

    public String getCode() { return code; }
    public Long getSourceHubId() { return sourceHubId; }
    public Long getTargetHubId() { return targetHubId; }
    public Long getDriverId() { return driverId; }
    public Status getStatus() { return status; }
    public Long getAlertId() { return alertId; }
    public Long getRecommendationId() { return recommendationId; }
}
