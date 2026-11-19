package vn.edu.hcmut.emobility.rental;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationExtensionRepository extends JpaRepository<ReservationExtension, Long> {
    Optional<ReservationExtension> findByReservationIdAndRequestId(Long reservationId, String requestId);
    List<ReservationExtension> findByReservationIdOrderById(Long reservationId);
}
