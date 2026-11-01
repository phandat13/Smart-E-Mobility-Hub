package vn.edu.hcmut.emobility.hub;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "hub")
public class Hub extends BaseEntity {

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HubType type;

    @Column(name = "parking_capacity", nullable = false)
    private int parkingCapacity;

    // Schema chưa chốt danh sách trạng thái (seed chỉ có ACTIVE) nên để String.
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    protected Hub() {}

    public String getCode() { return code; }
    public String getName() { return name; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public HubType getType() { return type; }
    public int getParkingCapacity() { return parkingCapacity; }
    public String getStatus() { return status; }
    public Instant getLastSyncAt() { return lastSyncAt; }
}
