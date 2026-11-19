package vn.edu.hcmut.emobility.personal;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingExtensionRepository extends JpaRepository<BookingExtension, Long> {
    Optional<BookingExtension> findByBookingIdAndRequestId(Long bookingId, String requestId);
}
