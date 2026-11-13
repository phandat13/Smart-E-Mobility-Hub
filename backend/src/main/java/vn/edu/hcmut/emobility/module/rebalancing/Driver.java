package vn.edu.hcmut.emobility.module.rebalancing;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "driver")
public class Driver extends BaseEntity {

    public enum Status { FREE, BUSY }

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    protected Driver() {}

    public Long getUserId() { return userId; }
    public Status getStatus() { return status; }

    public void busy() { status = Status.BUSY; }
    public void free() { status = Status.FREE; }
}
