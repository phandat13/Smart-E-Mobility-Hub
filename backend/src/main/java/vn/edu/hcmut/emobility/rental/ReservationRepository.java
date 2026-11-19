package vn.edu.hcmut.emobility.rental;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByStudentIdOrderByIdDesc(Long studentId);
    Optional<Reservation> findFirstByStudentIdAndStatusInOrderByIdDesc(Long studentId, Collection<ReservationStatus> statuses);
    Optional<Reservation> findFirstByVehicleIdAndStatusInOrderByIdDesc(Long vehicleId, Collection<ReservationStatus> statuses);
    boolean existsByStudentIdAndStatusIn(Long studentId, Collection<ReservationStatus> statuses);
    long countByHubIdAndStatusIn(Long hubId, Collection<ReservationStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reservation r where r.id = :id")
    Optional<Reservation> lockById(@Param("id") Long id);

    @Query("select r.id from Reservation r where r.status = vn.edu.hcmut.emobility.rental.ReservationStatus.RESERVED and r.expiresAt < :now")
    List<Long> findDueForExpiry(@Param("now") Instant now);
}
