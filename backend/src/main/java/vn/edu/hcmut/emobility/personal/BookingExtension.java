package vn.edu.hcmut.emobility.personal;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "booking_extension")
public class BookingExtension extends BaseEntity {
    @Column(name = "booking_id", nullable = false) private Long bookingId;
    @Column(name = "request_id", nullable = false) private String requestId;
    @Column(name = "old_end_at", nullable = false) private Instant oldEndAt;
    @Column(name = "new_end_at", nullable = false) private Instant newEndAt;

    protected BookingExtension() {}

    public BookingExtension(Long bookingId, String requestId, Instant oldEndAt, Instant newEndAt) {
        this.bookingId = bookingId;
        this.requestId = requestId;
        this.oldEndAt = oldEndAt;
        this.newEndAt = newEndAt;
    }

    public Long getBookingId() { return bookingId; }
    public Instant getNewEndAt() { return newEndAt; }
}
