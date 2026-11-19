package vn.edu.hcmut.emobility.charging;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.ColumnTransformer;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "charging_schedule")
public class ChargingSchedule extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(name = "hub_id", nullable = false) private Long hubId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ScheduleStatus status;
    @Column(name = "horizon_start", nullable = false) private Instant horizonStart;
    @Column(name = "horizon_end", nullable = false) private Instant horizonEnd;
    @Column(columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String unmet;
    @Column(name = "created_by") private Long createdBy;
    @Column(name = "confirmed_by") private Long confirmedBy;
    @Column(name = "confirmed_at") private Instant confirmedAt;

    protected ChargingSchedule() {}

    public ChargingSchedule(String code, Long hubId, Instant horizonStart, Instant horizonEnd, String unmet, Long createdBy) {
        this.code = code;
        this.hubId = hubId;
        this.horizonStart = horizonStart;
        this.horizonEnd = horizonEnd;
        this.unmet = unmet;
        this.createdBy = createdBy;
        this.status = ScheduleStatus.DRAFT;
    }

    public String getCode() { return code; }
    public Long getHubId() { return hubId; }
    public ScheduleStatus getStatus() { return status; }
    public Instant getHorizonStart() { return horizonStart; }
    public Instant getHorizonEnd() { return horizonEnd; }
    public String getUnmet() { return unmet; }
    public Long getCreatedBy() { return createdBy; }
    public Long getConfirmedBy() { return confirmedBy; }
    public Instant getConfirmedAt() { return confirmedAt; }

    public void setStatus(ScheduleStatus status) { this.status = status; }
    public void confirm(Long by, Instant at) { this.status = ScheduleStatus.CONFIRMED; this.confirmedBy = by; this.confirmedAt = at; }
}
