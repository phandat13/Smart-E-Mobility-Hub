package vn.edu.hcmut.emobility.monitoring;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "alert")
public class Alert extends BaseEntity {
    @Enumerated(EnumType.STRING) @Column(nullable = false) private AlertType type;
    @Column(name = "hub_id") private Long hubId;
    @Column(name = "resource_type") private String resourceType;
    @Column(name = "resource_id") private Long resourceId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private AlertSeverity severity;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private AlertStatus status;
    @Column(nullable = false) private String message;
    @Column(name = "resolved_at") private Instant resolvedAt;

    protected Alert() {}

    public AlertType getType() { return type; }
    public Long getHubId() { return hubId; }
    public String getResourceType() { return resourceType; }
    public Long getResourceId() { return resourceId; }
    public AlertSeverity getSeverity() { return severity; }
    public AlertStatus getStatus() { return status; }
    public String getMessage() { return message; }
    public Instant getResolvedAt() { return resolvedAt; }

    public void acknowledge() { if (status == AlertStatus.OPEN) status = AlertStatus.ACKNOWLEDGED; }
    public void resolve(Instant at) { status = AlertStatus.RESOLVED; resolvedAt = at; }
    public void setMessage(String message) { this.message = message; }
}
