package vn.edu.hcmut.emobility.module.hub;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "parking_slot")
public class ParkingSlot extends VersionedEntity {

    public enum Kind {
        /** Chỗ đỗ của xe dùng chung (RE). */
        SHARED,
        /** Chỗ đỗ cho xe cá nhân đặt trước (PV). */
        PERSONAL
    }

    @Column(name = "hub_id", nullable = false)
    private Long hubId;

    @Column(nullable = false, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Kind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResourceStatus status;

    protected ParkingSlot() {}

    public Long getHubId() { return hubId; }
    public String getCode() { return code; }
    public Kind getKind() { return kind; }
    public ResourceStatus getStatus() { return status; }

    public void changeStatus(ResourceStatus status) { this.status = status; }
}
