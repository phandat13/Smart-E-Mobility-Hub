package vn.edu.hcmut.emobility.core.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnTransformer;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "audit_log")
public class AuditLog extends BaseEntity {
    @Column(name = "actor_id") private Long actorId;
    @Column(nullable = false) private String action;
    @Column(name = "entity_type") private String entityType;
    @Column(name = "entity_id") private Long entityId;
    @Column(columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String details;

    protected AuditLog() {}

    public AuditLog(Long actorId, String action, String entityType, Long entityId, String details) {
        this.actorId = actorId;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.details = details;
    }

    public Long getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public Long getEntityId() { return entityId; }
    public String getDetails() { return details; }
}
