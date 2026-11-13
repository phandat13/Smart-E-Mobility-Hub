package vn.edu.hcmut.emobility.module.rebalancing;

import jakarta.persistence.*;
import java.util.EnumSet;
import java.util.Set;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

/** Một xe trong một lệnh điều chuyển. */
@Entity
@Table(name = "transfer_item")
public class TransferItem extends BaseEntity {

    public enum Status {
        /** Xe đã bị khóa tại Hub nguồn, chờ tài xế tới lấy. */
        LOCKED,
        /** Xe đã lên xe tải. */
        LOADED,
        /** Xe đã tới Hub đích. */
        DELIVERED,
        /** Xe bị gỡ khỏi lệnh, đã mở khóa. */
        REMOVED;

        /** Xe vẫn đang thuộc lệnh, chưa xong. */
        public static final Set<Status> MOVING = EnumSet.of(LOCKED, LOADED);
    }

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    protected TransferItem() {}

    public static TransferItem lock(Long orderId, Long vehicleId) {
        TransferItem i = new TransferItem();
        i.orderId = orderId;
        i.vehicleId = vehicleId;
        i.status = Status.LOCKED;
        return i;
    }

    public void load() { status = Status.LOADED; }
    public void deliver() { status = Status.DELIVERED; }
    public void remove() { status = Status.REMOVED; }

    public Long getOrderId() { return orderId; }
    public Long getVehicleId() { return vehicleId; }
    public Status getStatus() { return status; }
}
