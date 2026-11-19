package vn.edu.hcmut.emobility.maintenance;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "incident_follow_up")
public class IncidentFollowUp extends BaseEntity {
    @Column(name = "incident_id", nullable = false) private Long incidentId;
    @Column(name = "user_id") private Long userId;
    private String note;

    protected IncidentFollowUp() {}

    public IncidentFollowUp(Long incidentId, Long userId, String note) {
        this.incidentId = incidentId;
        this.userId = userId;
        this.note = note;
    }

    public Long getIncidentId() { return incidentId; }
    public Long getUserId() { return userId; }
    public String getNote() { return note; }
}
