package vn.edu.hcmut.emobility.maintenance;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    Optional<Incident> findFirstByTargetTypeAndTargetIdAndStatusIn(TargetType type, Long targetId, Collection<IncidentStatus> statuses);
    boolean existsByTargetTypeAndTargetIdAndStatusIn(TargetType type, Long targetId, Collection<IncidentStatus> statuses);
    List<Incident> findByStatusInOrderByIdDesc(Collection<IncidentStatus> statuses);
    List<Incident> findTop100ByOrderByIdDesc();
    List<Incident> findByReporterIdOrderByIdDesc(Long reporterId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Incident i where i.id = :id")
    Optional<Incident> lockById(@Param("id") Long id);
}
