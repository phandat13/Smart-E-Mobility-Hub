package vn.edu.hcmut.emobility.charging;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChargingSessionRepository extends JpaRepository<ChargingSession, Long> {
    Optional<ChargingSession> findFirstByPortIdAndStatusIn(Long portId, Collection<SessionStatus> statuses);
    Optional<ChargingSession> findFirstByVehicleIdAndStatusIn(Long vehicleId, Collection<SessionStatus> statuses);
    Optional<ChargingSession> findFirstBySlotBookingIdAndStatusIn(Long bookingId, Collection<SessionStatus> statuses);
    Optional<ChargingSession> findFirstBySlotBookingIdOrderByIdDesc(Long bookingId);
    List<ChargingSession> findByStatus(SessionStatus status);
    List<ChargingSession> findTop50ByOrderByIdDesc();
    boolean existsByPortIdAndStatusIn(Long portId, Collection<SessionStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ChargingSession s where s.id = :id")
    Optional<ChargingSession> lockById(@Param("id") Long id);
}
