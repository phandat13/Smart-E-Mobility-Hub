package vn.edu.hcmut.emobility.rebalance;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "driver")
public class Driver extends BaseEntity {
    @Column(name = "user_id", nullable = false, unique = true) private Long userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private DriverStatus status;
    @Column(name = "truck_plate") private String truckPlate;
    @Column(nullable = false) private int capacity;

    protected Driver() {}

    public Long getUserId() { return userId; }
    public DriverStatus getStatus() { return status; }
    public String getTruckPlate() { return truckPlate; }
    public int getCapacity() { return capacity; }
    public void setStatus(DriverStatus status) { this.status = status; }
}
