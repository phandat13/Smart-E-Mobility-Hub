package vn.edu.hcmut.emobility.vehicle;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "vehicle")
public class Vehicle extends VersionedEntity {

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VehicleType type;

    @Column(name = "hub_id")
    private Long hubId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private VehicleStatus status;

    @Column(name = "battery_percent", nullable = false)
    private short batteryPercent;

    @Column(name = "range_km", nullable = false)
    private double rangeKm;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    protected Vehicle() {}

    public String getCode() { return code; }
    public VehicleType getType() { return type; }
    public Long getHubId() { return hubId; }
    public VehicleStatus getStatus() { return status; }
    public int getBatteryPercent() { return batteryPercent; }
    public double getRangeKm() { return rangeKm; }
    public Instant getLastSeenAt() { return lastSeenAt; }

    public void changeStatus(VehicleStatus status) { this.status = status; }
}
