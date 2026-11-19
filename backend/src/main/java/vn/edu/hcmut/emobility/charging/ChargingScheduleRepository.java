package vn.edu.hcmut.emobility.charging;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChargingScheduleRepository extends JpaRepository<ChargingSchedule, Long> {
    List<ChargingSchedule> findTop50ByOrderByIdDesc();
    Optional<ChargingSchedule> findFirstByHubIdAndStatusOrderByIdDesc(Long hubId, ScheduleStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ChargingSchedule s where s.id = :id")
    Optional<ChargingSchedule> lockById(@Param("id") Long id);
}
