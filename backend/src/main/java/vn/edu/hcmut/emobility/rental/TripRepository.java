package vn.edu.hcmut.emobility.rental;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripRepository extends JpaRepository<Trip, Long> {
    Optional<Trip> findFirstByStudentIdAndStatusInOrderByIdDesc(Long studentId, Collection<TripStatus> statuses);
    Optional<Trip> findFirstByVehicleIdAndStatusInOrderByIdDesc(Long vehicleId, Collection<TripStatus> statuses);
    List<Trip> findByStudentIdOrderByStartedAtDesc(Long studentId);
    List<Trip> findByStatus(TripStatus status);
    Optional<Trip> findByReservationId(Long reservationId);
    boolean existsByStudentIdAndStatusIn(Long studentId, Collection<TripStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Trip t where t.id = :id")
    Optional<Trip> lockById(@Param("id") Long id);
}
