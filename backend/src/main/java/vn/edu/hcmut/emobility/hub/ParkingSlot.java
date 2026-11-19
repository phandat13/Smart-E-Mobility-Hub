package vn.edu.hcmut.emobility.hub;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "parking_slot")
public class ParkingSlot extends VersionedEntity {
    @Column(name = "hub_id", nullable = false) private Long hubId;
    @Column(nullable = false) private String code;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SlotKind kind;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SlotStatus status;
    @Column(name = "vehicle_id") private Long vehicleId;
    @Column(name = "held_for_item_id") private Long heldForItemId;
    @Column(name = "last_seen_at") private Instant lastSeenAt;

    protected ParkingSlot() {}

    public ParkingSlot(Long hubId, String code, SlotKind kind) {
        this.hubId = hubId;
        this.code = code;
        this.kind = kind;
        this.status = SlotStatus.PENDING_CHECK;
    }

    public Long getHubId() { return hubId; }
    public String getCode() { return code; }
    public SlotKind getKind() { return kind; }
    public SlotStatus getStatus() { return status; }
    public Long getVehicleId() { return vehicleId; }
    public Long getHeldForItemId() { return heldForItemId; }
    public Instant getLastSeenAt() { return lastSeenAt; }

    public void setStatus(SlotStatus status) { this.status = status; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }
    public void seen(Instant at) { this.lastSeenAt = at; }

    /** Góp ý #10: giữ ô cho một xe trong lệnh điều chuyển. */
    public void holdFor(Long transferItemId) { this.status = SlotStatus.HELD; this.heldForItemId = transferItemId; }

    public void releaseHold() {
        if (status == SlotStatus.HELD) status = SlotStatus.AVAILABLE;
        heldForItemId = null;
    }

    public void occupy(Long vehicleId) { this.vehicleId = vehicleId; this.status = SlotStatus.OCCUPIED; this.heldForItemId = null; }

    /** Xe rời ô: chờ xác minh cảm biến trước khi mở lại (mục 2.3). */
    public void vacate() { this.vehicleId = null; if (status == SlotStatus.OCCUPIED) status = SlotStatus.PENDING_CHECK; }
}
