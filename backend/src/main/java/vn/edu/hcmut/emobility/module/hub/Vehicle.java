package vn.edu.hcmut.emobility.module.hub;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

/** Xe điện dùng chung của hệ thống (RE cho thuê, RB điều chuyển). */
@Entity
@Table(name = "vehicle")
public class Vehicle extends VersionedEntity {

    public enum Type { E_BIKE, E_SCOOTER }

    public enum Status {
        AVAILABLE,
        RESERVED,
        PICKUP_PENDING,
        IN_USE,
        PENDING_CHECK,
        NEEDS_CHARGE,
        CHARGING,
        TRANSFER_LOCKED,
        FAULTY,
        MAINTENANCE_LOCKED,
        OUT_OF_SERVICE;

        /** Xe đã bị RB (điều chuyển) hoặc MT (bảo trì) giữ. */
        public boolean lockedByOperation() {
            return this == TRANSFER_LOCKED || this == MAINTENANCE_LOCKED;
        }
    }

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    @Column(name = "hub_id")
    private Long hubId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Status status;

    @Column(name = "battery_percent", nullable = false)
    private short batteryPercent;

    @Column(name = "range_km", nullable = false)
    private double rangeKm;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    protected Vehicle() {}

    public String getCode() { return code; }
    public Type getType() { return type; }
    public Long getHubId() { return hubId; }
    public Status getStatus() { return status; }
    public int getBatteryPercent() { return batteryPercent; }
    public double getRangeKm() { return rangeKm; }
    public Instant getLastSeenAt() { return lastSeenAt; }

    public void changeStatus(Status status) { this.status = status; }

    /** Hết bị giữ (đơn hết hạn, điều chuyển xong...): trả về phục vụ, pin dưới ngưỡng thì chờ sạc. */
    public void release(int minBatteryPercent) {
        status = batteryPercent < minBatteryPercent ? Status.NEEDS_CHARGE : Status.AVAILABLE;
    }

    /** {@code null} = đang trên xe tải điều chuyển (RB), không thuộc Hub nào. */
    public void changeHub(Long hubId) { this.hubId = hubId; }
}
