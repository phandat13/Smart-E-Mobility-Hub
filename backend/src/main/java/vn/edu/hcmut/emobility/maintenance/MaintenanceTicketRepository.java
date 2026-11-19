package vn.edu.hcmut.emobility.maintenance;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MaintenanceTicketRepository extends JpaRepository<MaintenanceTicket, Long> {
    List<MaintenanceTicket> findByOrderIdOrderById(Long orderId);

    @Query("select case when count(t) > 0 then true else false end from MaintenanceTicket t, MaintenanceOrder o where t.orderId = o.id and t.targetType = :type "
            + "and t.targetId = :targetId and o.status in (vn.edu.hcmut.emobility.maintenance.MaintenanceOrderStatus.PENDING, "
            + "vn.edu.hcmut.emobility.maintenance.MaintenanceOrderStatus.IN_PROGRESS) "
            + "and t.progress not in (vn.edu.hcmut.emobility.maintenance.TicketProgress.DONE, vn.edu.hcmut.emobility.maintenance.TicketProgress.UNREPAIRABLE)")
    boolean hasOpenTicket(@Param("type") TargetType type, @Param("targetId") Long targetId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from MaintenanceTicket t where t.id = :id")
    Optional<MaintenanceTicket> lockById(@Param("id") Long id);
}
