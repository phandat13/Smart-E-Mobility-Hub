package vn.edu.hcmut.emobility.rental;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "reservation_extension")
public class ReservationExtension extends BaseEntity {
    @Column(name = "reservation_id", nullable = false) private Long reservationId;
    @Column(name = "request_id", nullable = false) private String requestId;
    @Column(name = "old_expires_at", nullable = false) private Instant oldExpiresAt;
    @Column(name = "new_expires_at", nullable = false) private Instant newExpiresAt;

    protected ReservationExtension() {}

    public ReservationExtension(Long reservationId, String requestId, Instant oldExpiresAt, Instant newExpiresAt) {
        this.reservationId = reservationId;
        this.requestId = requestId;
        this.oldExpiresAt = oldExpiresAt;
        this.newExpiresAt = newExpiresAt;
    }

    public Long getReservationId() { return reservationId; }
    public String getRequestId() { return requestId; }
    public Instant getOldExpiresAt() { return oldExpiresAt; }
    public Instant getNewExpiresAt() { return newExpiresAt; }
}
