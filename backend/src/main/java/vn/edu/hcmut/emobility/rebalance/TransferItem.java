package vn.edu.hcmut.emobility.rebalance;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "transfer_item")
public class TransferItem extends VersionedEntity {
    @Column(name = "order_id", nullable = false) private Long orderId;
    @Column(name = "vehicle_id", nullable = false) private Long vehicleId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private TransferItemStatus status;
    @Column(name = "held_slot_id") private Long heldSlotId;
    @Column(name = "delivered_hub_id") private Long deliveredHubId;
    @Column(name = "loaded_at") private Instant loadedAt;
    @Column(name = "delivered_at") private Instant deliveredAt;
    private String note;

    protected TransferItem() {}

    public TransferItem(Long orderId, Long vehicleId) {
        this.orderId = orderId;
        this.vehicleId = vehicleId;
        this.status = TransferItemStatus.LOCKED;
    }

    public Long getOrderId() { return orderId; }
    public Long getVehicleId() { return vehicleId; }
    public TransferItemStatus getStatus() { return status; }
    public Long getHeldSlotId() { return heldSlotId; }
    public Long getDeliveredHubId() { return deliveredHubId; }
    public Instant getLoadedAt() { return loadedAt; }
    public Instant getDeliveredAt() { return deliveredAt; }
    public String getNote() { return note; }

    public void holdSlot(Long slotId) { this.heldSlotId = slotId; }
    public void loaded(Instant at) { this.status = TransferItemStatus.LOADED; this.loadedAt = at; }
    public void inTransit() { this.status = TransferItemStatus.IN_TRANSIT; }
    public void delivered(Long hubId, Instant at) { this.status = TransferItemStatus.DELIVERED; this.deliveredHubId = hubId; this.deliveredAt = at; }
    public void fail(String note) { this.status = TransferItemStatus.FAILED; this.note = note; this.heldSlotId = null; }
    public void remove(String note) { this.status = TransferItemStatus.REMOVED; this.note = note; this.heldSlotId = null; }
}
