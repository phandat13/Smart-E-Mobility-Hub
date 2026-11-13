package vn.edu.hcmut.emobility.module.rental;

import jakarta.persistence.*;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;
import vn.edu.hcmut.emobility.core.common.BaseEntity;
import vn.edu.hcmut.emobility.module.hub.Vehicle;

@Entity
@Table(name = "reservation")
public class Reservation extends BaseEntity {

    public enum Status {
        RESERVED,
        PICKED_UP,
        COMPLETED,
        CANCELLED,
        EXPIRED;

        /** Đơn còn hiệu lực: trong lúc có đơn này, sinh viên không được đặt thêm xe. */
        public static final Set<Status> ACTIVE = EnumSet.of(RESERVED, PICKED_UP);
    }

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Column(name = "hub_id", nullable = false)
    private Long hubId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "reserved_at", nullable = false)
    private Instant reservedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "extension_count", nullable = false)
    private short extensionCount;

    protected Reservation() {}

    /** RE01: tạo đơn giữ chỗ, hết hạn sau {@code hold}. */
    public static Reservation hold(Long studentId, Vehicle vehicle, Instant now, Duration hold) {
        Reservation r = new Reservation();
        r.code = "RS" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        r.studentId = studentId;
        r.vehicleId = vehicle.getId();
        r.hubId = vehicle.getHubId();
        r.status = Status.RESERVED;
        r.reservedAt = now;
        r.expiresAt = now.plus(hold);
        return r;
    }

    public boolean isExpiredAt(Instant now) { return !now.isBefore(expiresAt); }

    /** RE04: cộng thêm thời gian giữ chỗ. */
    public void extend(Duration extra) {
        expiresAt = expiresAt.plus(extra);
        extensionCount++;
    }

    public void expire() { status = Status.EXPIRED; }

    public String getCode() { return code; }
    public Long getStudentId() { return studentId; }
    public Long getVehicleId() { return vehicleId; }
    public Long getHubId() { return hubId; }
    public Status getStatus() { return status; }
    public Instant getReservedAt() { return reservedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public int getExtensionCount() { return extensionCount; }
}
