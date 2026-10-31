package vn.edu.hcmut.emobility.rental;

import jakarta.persistence.*;
import java.time.Duration;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.BaseEntity;
import vn.edu.hcmut.emobility.vehicle.Vehicle;

@Entity
@Table(name = "reservation")
public class Reservation extends BaseEntity {

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
    private ReservationStatus status;

    @Column(name = "reserved_at", nullable = false)
    private Instant reservedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "extension_count", nullable = false)
    private short extensionCount;

    protected Reservation() {}

    /** RE01: tạo đơn giữ chỗ, hết hạn sau {@code hold}. */
    public static Reservation hold(String code, Long studentId, Vehicle vehicle, Instant now, Duration hold) {
        Reservation r = new Reservation();
        r.code = code;
        r.studentId = studentId;
        r.vehicleId = vehicle.getId();
        r.hubId = vehicle.getHubId();
        r.status = ReservationStatus.RESERVED;
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

    public void expire() { status = ReservationStatus.EXPIRED; }

    public String getCode() { return code; }
    public Long getStudentId() { return studentId; }
    public Long getVehicleId() { return vehicleId; }
    public Long getHubId() { return hubId; }
    public ReservationStatus getStatus() { return status; }
    public Instant getReservedAt() { return reservedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public int getExtensionCount() { return extensionCount; }
}
