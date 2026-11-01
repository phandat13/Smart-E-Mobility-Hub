package vn.edu.hcmut.emobility.rebalancing;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "driver")
public class Driver extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DriverStatus status;

    protected Driver() {}

    public Long getUserId() { return userId; }
    public DriverStatus getStatus() { return status; }

    public void busy() { status = DriverStatus.BUSY; }
    public void free() { status = DriverStatus.FREE; }
}
