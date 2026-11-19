package vn.edu.hcmut.emobility.core.audit;

import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.common.JsonSupport;

/** Ghi nhật ký nghiệp vụ (đăng nhập, vi phạm no-show, áp dụng khuyến nghị, cưỡng chế bảo trì...). */
@Service
public class AuditService {

    private final AuditLogRepository repo;
    private final JsonSupport json;

    public AuditService(AuditLogRepository repo, JsonSupport json) {
        this.repo = repo;
        this.json = json;
    }

    @Transactional
    public void record(Long actorId, String action, String entityType, Long entityId, Map<String, ?> details) {
        repo.save(new AuditLog(actorId, action, entityType, entityId, details == null ? null : json.write(details)));
    }
}
