package vn.edu.hcmut.emobility.hub;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "parking_slot")
public class ParkingSlot extends VersionedEntity {

    @Column(name = "hub_id", nullable = false)
    private Long hubId;

    @Column(nullable = false, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SlotKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResourceStatus status;

    protected ParkingSlot() {}

    public Long getHubId() { return hubId; }
    public String getCode() { return code; }
    public SlotKind getKind() { return kind; }
    public ResourceStatus getStatus() { return status; }

    public void changeStatus(ResourceStatus status) { this.status = status; }
}
