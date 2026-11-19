package vn.edu.hcmut.emobility.maintenance;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.ColumnTransformer;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "incident")
public class Incident extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(name = "reporter_id") private Long reporterId;
    @Column(name = "hub_id", nullable = false) private Long hubId;
    @Enumerated(EnumType.STRING) @Column(name = "target_type", nullable = false) private TargetType targetType;
    @Column(name = "target_id", nullable = false) private Long targetId;
    @Column(nullable = false) private String category;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Severity severity;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private IncidentSource source;
    @Column(nullable = false) private String description;
    @Column(name = "photo_urls", columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String photoUrls;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private IncidentStatus status;
    @Column(name = "trip_id") private Long tripId;
    @Column(name = "follow_ups", nullable = false) private int followUps;
    @Column(name = "closed_at") private Instant closedAt;

    protected Incident() {}

    public Incident(String code, Long reporterId, Long hubId, TargetType targetType, Long targetId, String category,
                    Severity severity, IncidentSource source, String description, String photoUrls, Long tripId) {
        this.code = code;
        this.reporterId = reporterId;
        this.hubId = hubId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.category = category;
        this.severity = severity;
        this.source = source;
        this.description = description;
        this.photoUrls = photoUrls;
        this.tripId = tripId;
        this.status = IncidentStatus.OPEN;
    }

    public String getCode() { return code; }
    public Long getReporterId() { return reporterId; }
    public Long getHubId() { return hubId; }
    public TargetType getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public String getCategory() { return category; }
    public Severity getSeverity() { return severity; }
    public IncidentSource getSource() { return source; }
    public String getDescription() { return description; }
    public String getPhotoUrls() { return photoUrls; }
    public IncidentStatus getStatus() { return status; }
    public Long getTripId() { return tripId; }
    public int getFollowUps() { return followUps; }
    public Instant getClosedAt() { return closedAt; }

    public void setStatus(IncidentStatus status) { this.status = status; }
    public void escalate(Severity s) { if (s.ordinal() > severity.ordinal()) severity = s; }
    public void addFollowUp() { followUps++; }
    public void close(Instant at) { status = IncidentStatus.CLOSED; closedAt = at; }
}
