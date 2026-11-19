package vn.edu.hcmut.emobility.fleet;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;
import vn.edu.hcmut.emobility.core.iot.LockState;

@Entity
@Table(name = "vehicle")
public class Vehicle extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private VehicleType type;
    private String model;
    @Column(name = "hub_id") private Long hubId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private VehicleStatus status;
    @Column(name = "battery_percent", nullable = false) private short batteryPercent;
    @Column(name = "battery_capacity_kwh", nullable = false) private double batteryCapacityKwh;
    @Column(name = "range_km", nullable = false) private double rangeKm;
    @Enumerated(EnumType.STRING) @Column(name = "lock_state", nullable = false) private LockState lockState;
    @Column(name = "error_code") private String errorCode;
    @Column(name = "last_seen_at") private Instant lastSeenAt;
    @Column(name = "odometer_km", nullable = false) private double odometerKm;
    @Column(name = "rating_sum", nullable = false) private int ratingSum;
    @Column(name = "rating_count", nullable = false) private int ratingCount;

    protected Vehicle() {}

    public Vehicle(String code, VehicleType type, String model, Long hubId, int battery, double capacityKwh, double rangeKm) {
        this.code = code;
        this.type = type;
        this.model = model;
        this.hubId = hubId;
        this.batteryPercent = (short) battery;
        this.batteryCapacityKwh = capacityKwh;
        this.rangeKm = rangeKm;
        this.status = VehicleStatus.PENDING_CHECK;
        this.lockState = LockState.LOCKED;
    }

    public String getCode() { return code; }
    public VehicleType getType() { return type; }
    public String getModel() { return model; }
    public Long getHubId() { return hubId; }
    public VehicleStatus getStatus() { return status; }
    public int getBatteryPercent() { return batteryPercent; }
    public double getBatteryCapacityKwh() { return batteryCapacityKwh; }
    public double getRangeKm() { return rangeKm; }
    public LockState getLockState() { return lockState; }
    public String getErrorCode() { return errorCode; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public double getOdometerKm() { return odometerKm; }
    public Double getRating() { return ratingCount == 0 ? null : (double) ratingSum / ratingCount; }

    public void setStatus(VehicleStatus status) { this.status = status; }
    public void setHubId(Long hubId) { this.hubId = hubId; }
    public void setLockState(LockState lockState) { this.lockState = lockState; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
    public void setSpec(VehicleType type, String model, double capacityKwh) { this.type = type; this.model = model; this.batteryCapacityKwh = capacityKwh; }

    public void reportBattery(int percent, Instant at) {
        this.batteryPercent = (short) Math.max(0, Math.min(100, percent));
        this.rangeKm = Math.round(batteryPercent * (type == VehicleType.E_SCOOTER ? 0.62 : 0.4) * 10) / 10.0;
        this.lastSeenAt = at;
    }

    public void addDistance(double km) { this.odometerKm += km; }
    public void seen(Instant at) { this.lastSeenAt = at; }
    public void addRating(int stars) { ratingSum += stars; ratingCount++; }
}
