package vn.edu.hcmut.emobility.rebalance;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "transfer_order")
public class TransferOrder extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(name = "source_hub_id", nullable = false) private Long sourceHubId;
    @Column(name = "target_hub_id", nullable = false) private Long targetHubId;
    @Column(name = "driver_id") private Long driverId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private TransferOrderStatus status;
    @Column(name = "alert_id") private Long alertId;
    @Column(name = "recommendation_id") private Long recommendationId;
    @Column(name = "created_by") private Long createdBy;
    private String note;
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "completed_at") private Instant completedAt;

    protected TransferOrder() {}

    public TransferOrder(String code, Long sourceHubId, Long targetHubId, Long alertId, Long recommendationId, Long createdBy, String note) {
        this.code = code;
        this.sourceHubId = sourceHubId;
        this.targetHubId = targetHubId;
        this.alertId = alertId;
        this.recommendationId = recommendationId;
        this.createdBy = createdBy;
        this.note = note;
        this.status = TransferOrderStatus.QUEUED;
    }

    public String getCode() { return code; }
    public Long getSourceHubId() { return sourceHubId; }
    public Long getTargetHubId() { return targetHubId; }
    public Long getDriverId() { return driverId; }
    public TransferOrderStatus getStatus() { return status; }
    public Long getAlertId() { return alertId; }
    public Long getRecommendationId() { return recommendationId; }
    public Long getCreatedBy() { return createdBy; }
    public String getNote() { return note; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }

    public void assign(Long driverId) { this.driverId = driverId; this.status = TransferOrderStatus.ASSIGNED; }
    public void setStatus(TransferOrderStatus status) { this.status = status; }
    public void started(Instant at) { if (startedAt == null) startedAt = at; }
    public void completed(Instant at) { this.completedAt = at; }
    public void retarget(Long hubId, String note) { this.targetHubId = hubId; this.note = note; }
}
