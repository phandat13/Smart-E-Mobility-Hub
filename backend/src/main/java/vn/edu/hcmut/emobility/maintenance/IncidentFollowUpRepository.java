package vn.edu.hcmut.emobility.maintenance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentFollowUpRepository extends JpaRepository<IncidentFollowUp, Long> {
    List<IncidentFollowUp> findByIncidentIdOrderById(Long incidentId);
}
