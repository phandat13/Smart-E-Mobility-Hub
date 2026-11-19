package vn.edu.hcmut.emobility.core.audit;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEntityTypeAndEntityIdOrderByIdDesc(String entityType, Long entityId);
    List<AuditLog> findTop50ByOrderByIdDesc();
}
