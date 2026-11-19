package vn.edu.hcmut.emobility.maintenance;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MaintenanceOrderRepository extends JpaRepository<MaintenanceOrder, Long> {
    List<MaintenanceOrder> findByTechnicianIdAndStatusInOrderByIdDesc(Long technicianId, Collection<MaintenanceOrderStatus> statuses);
    List<MaintenanceOrder> findTop100ByOrderByIdDesc();
    List<MaintenanceOrder> findByIncidentId(Long incidentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from MaintenanceOrder o where o.id = :id")
    Optional<MaintenanceOrder> lockById(@Param("id") Long id);
}
