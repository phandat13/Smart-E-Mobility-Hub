package vn.edu.hcmut.emobility.maintenance;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "maintenance_ticket")
public class MaintenanceTicket extends VersionedEntity {
    @Column(name = "order_id", nullable = false) private Long orderId;
    @Enumerated(EnumType.STRING) @Column(name = "target_type", nullable = false) private TargetType targetType;
    @Column(name = "target_id", nullable = false) private Long targetId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private TicketProgress progress;
    private String diagnosis;
    @Column(name = "repair_items") private String repairItems;
    @Column(name = "replaced_parts") private String replacedParts;
    @Column(name = "verification_note") private String verificationNote;

    protected MaintenanceTicket() {}

    public MaintenanceTicket(Long orderId, TargetType targetType, Long targetId) {
        this.orderId = orderId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.progress = TicketProgress.PENDING;
    }

    public Long getOrderId() { return orderId; }
    public TargetType getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public TicketProgress getProgress() { return progress; }
    public String getDiagnosis() { return diagnosis; }
    public String getRepairItems() { return repairItems; }
    public String getReplacedParts() { return replacedParts; }
    public String getVerificationNote() { return verificationNote; }

    public void fill(String diagnosis, String repairItems, String replacedParts) {
        this.diagnosis = diagnosis;
        this.repairItems = repairItems;
        this.replacedParts = replacedParts;
        if (progress == TicketProgress.PENDING) progress = TicketProgress.REPAIRING;
    }

    public void setProgress(TicketProgress p) { this.progress = p; }
    public void setVerificationNote(String n) { this.verificationNote = n; }
    public boolean isOpen() { return progress != TicketProgress.DONE && progress != TicketProgress.UNREPAIRABLE; }
}
