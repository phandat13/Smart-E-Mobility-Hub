package vn.edu.hcmut.emobility.charging;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChargingScheduleItemRepository extends JpaRepository<ChargingScheduleItem, Long> {
    List<ChargingScheduleItem> findByScheduleIdOrderByStartAt(Long scheduleId);
    List<ChargingScheduleItem> findByScheduleIdAndStatus(Long scheduleId, ScheduleItemStatus status);
    List<ChargingScheduleItem> findByVehicleIdAndStatusIn(Long vehicleId, Collection<ScheduleItemStatus> statuses);
    List<ChargingScheduleItem> findByPortIdAndStatusIn(Long portId, Collection<ScheduleItemStatus> statuses);
    List<ChargingScheduleItem> findByStatus(ScheduleItemStatus status);

    @Query("select i from ChargingScheduleItem i, ChargingSchedule s where i.scheduleId = s.id "
            + "and s.status = vn.edu.hcmut.emobility.charging.ScheduleStatus.CONFIRMED "
            + "and i.status = vn.edu.hcmut.emobility.charging.ScheduleItemStatus.SCHEDULED and i.vehicleId = :vehicleId "
            + "and i.startAt <= :to and i.endAt >= :from")
    List<ChargingScheduleItem> confirmedScheduledFor(@Param("vehicleId") Long vehicleId, @Param("from") Instant from, @Param("to") Instant to);

    @Query("select i from ChargingScheduleItem i, ChargingSchedule s where i.scheduleId = s.id "
            + "and s.status = vn.edu.hcmut.emobility.charging.ScheduleStatus.CONFIRMED "
            + "and i.status = vn.edu.hcmut.emobility.charging.ScheduleItemStatus.SCHEDULED and i.endAt < :now")
    List<ChargingScheduleItem> overdue(@Param("now") Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from ChargingScheduleItem i where i.id = :id")
    Optional<ChargingScheduleItem> lockById(@Param("id") Long id);
}
