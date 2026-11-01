package vn.edu.hcmut.emobility.rebalancing;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "transfer_item")
public class TransferItem extends BaseEntity {

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransferItemStatus status;

    protected TransferItem() {}

    public static TransferItem lock(Long orderId, Long vehicleId) {
        TransferItem i = new TransferItem();
        i.orderId = orderId;
        i.vehicleId = vehicleId;
        i.status = TransferItemStatus.LOCKED;
        return i;
    }

    public void load() { status = TransferItemStatus.LOADED; }
    public void deliver() { status = TransferItemStatus.DELIVERED; }
    public void remove() { status = TransferItemStatus.REMOVED; }

    public Long getOrderId() { return orderId; }
    public Long getVehicleId() { return vehicleId; }
    public TransferItemStatus getStatus() { return status; }
}
