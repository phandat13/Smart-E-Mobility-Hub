package vn.edu.hcmut.emobility.rental;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "reservation")
public class Reservation extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(name = "student_id", nullable = false) private Long studentId;
    @Column(name = "vehicle_id", nullable = false) private Long vehicleId;
    @Column(name = "hub_id", nullable = false) private Long hubId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ReservationStatus status;
    @Column(name = "reserved_at", nullable = false) private Instant reservedAt;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "extension_count", nullable = false) private short extensionCount;
    @Column(nullable = false) private boolean direct;
    @Column(name = "close_reason") private String closeReason;
    @Column(name = "closed_at") private Instant closedAt;

    protected Reservation() {}

    public Reservation(String code, Long studentId, Long vehicleId, Long hubId, ReservationStatus status,
                       Instant reservedAt, Instant expiresAt, boolean direct) {
        this.code = code;
        this.studentId = studentId;
        this.vehicleId = vehicleId;
        this.hubId = hubId;
        this.status = status;
        this.reservedAt = reservedAt;
        this.expiresAt = expiresAt;
        this.direct = direct;
    }

    public String getCode() { return code; }
    public Long getStudentId() { return studentId; }
    public Long getVehicleId() { return vehicleId; }
    public Long getHubId() { return hubId; }
    public ReservationStatus getStatus() { return status; }
    public Instant getReservedAt() { return reservedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public int getExtensionCount() { return extensionCount; }
    public boolean isDirect() { return direct; }
    public String getCloseReason() { return closeReason; }
    public Instant getClosedAt() { return closedAt; }

    public void setStatus(ReservationStatus status) { this.status = status; }
    public void extend(int minutes) { this.expiresAt = expiresAt.plusSeconds(minutes * 60L); this.extensionCount++; }
    public void close(ReservationStatus status, String reason, Instant at) { this.status = status; this.closeReason = reason; this.closedAt = at; }
    /** Góp ý #15: chuyển đơn sang xe thay thế khi xe gốc gặp sự cố. */
    public void reassignVehicle(Long newVehicleId) { this.vehicleId = newVehicleId; }
}
