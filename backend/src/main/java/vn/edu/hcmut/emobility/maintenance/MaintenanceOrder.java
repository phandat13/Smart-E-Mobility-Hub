package vn.edu.hcmut.emobility.maintenance;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "maintenance_order")
public class MaintenanceOrder extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(name = "technician_id") private Long technicianId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private MaintenanceOrderStatus status;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Severity priority;
    @Column(name = "due_at") private Instant dueAt;
    @Column(name = "incident_id") private Long incidentId;
    @Column(name = "alert_id") private Long alertId;
    private String note;
    @Column(name = "created_by", nullable = false) private Long createdBy;

    protected MaintenanceOrder() {}

    public MaintenanceOrder(String code, Long technicianId, Severity priority, Instant dueAt, Long incidentId, Long alertId,
                            String note, Long createdBy) {
        this.code = code;
        this.technicianId = technicianId;
        this.priority = priority;
        this.dueAt = dueAt;
        this.incidentId = incidentId;
        this.alertId = alertId;
        this.note = note;
        this.createdBy = createdBy;
        this.status = MaintenanceOrderStatus.PENDING;
    }

    public String getCode() { return code; }
    public Long getTechnicianId() { return technicianId; }
    public MaintenanceOrderStatus getStatus() { return status; }
    public Severity getPriority() { return priority; }
    public Instant getDueAt() { return dueAt; }
    public Long getIncidentId() { return incidentId; }
    public Long getAlertId() { return alertId; }
    public String getNote() { return note; }
    public Long getCreatedBy() { return createdBy; }

    public void setStatus(MaintenanceOrderStatus status) { this.status = status; }
}
