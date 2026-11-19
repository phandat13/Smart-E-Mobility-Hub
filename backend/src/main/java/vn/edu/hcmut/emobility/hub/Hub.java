package vn.edu.hcmut.emobility.hub;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "hub")
public class Hub extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(nullable = false, unique = true) private String name;
    private String address;
    private String area;
    @Column(nullable = false) private double latitude;
    @Column(nullable = false) private double longitude;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private HubType type;
    @Column(name = "parking_capacity", nullable = false) private int parkingCapacity;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private HubStatus status;
    @Column(name = "deactivation_reason") private String deactivationReason;
    @Column(name = "last_sync_at") private Instant lastSyncAt;

    protected Hub() {}

    public Hub(String code, String name, String address, String area, double latitude, double longitude, HubType type, int capacity) {
        this.code = code;
        this.name = name;
        this.address = address;
        this.area = area;
        this.latitude = latitude;
        this.longitude = longitude;
        this.type = type;
        this.parkingCapacity = capacity;
        this.status = HubStatus.ACTIVE;
    }

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getAddress() { return address; }
    public String getArea() { return area; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public HubType getType() { return type; }
    public int getParkingCapacity() { return parkingCapacity; }
    public HubStatus getStatus() { return status; }
    public String getDeactivationReason() { return deactivationReason; }
    public Instant getLastSyncAt() { return lastSyncAt; }
    public boolean isActive() { return status == HubStatus.ACTIVE; }

    public void update(String name, String address, String area, double lat, double lng, HubType type) {
        this.name = name;
        this.address = address;
        this.area = area;
        this.latitude = lat;
        this.longitude = lng;
        this.type = type;
    }

    public void setParkingCapacity(int c) { this.parkingCapacity = c; }
    public void deactivate(String reason) { this.status = HubStatus.INACTIVE; this.deactivationReason = reason; }
    public void activate() { this.status = HubStatus.ACTIVE; this.deactivationReason = null; }
    public void touchSync(Instant at) { this.lastSyncAt = at; }
}
