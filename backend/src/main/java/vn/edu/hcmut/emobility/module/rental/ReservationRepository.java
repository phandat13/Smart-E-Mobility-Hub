package vn.edu.hcmut.emobility.module.rental;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    boolean existsByStudentIdAndStatusIn(Long studentId, Collection<Reservation.Status> statuses);

    Optional<Reservation> findFirstByStudentIdAndStatusInOrderByReservedAtDesc(Long studentId,
                                                                               Collection<Reservation.Status> statuses);

    /** Khóa dòng để gia hạn (RE04) và job hết hạn không ghi đè lên nhau. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reservation r where r.id = :id")
    Optional<Reservation> findByIdForUpdate(Long id);

    @Query("select r.id from Reservation r where r.status = :status and r.expiresAt <= :now")
    List<Long> findIdsExpiredAt(Reservation.Status status, Instant now);
}
