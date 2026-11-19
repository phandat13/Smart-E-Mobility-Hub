package vn.edu.hcmut.emobility.monitoring;

import java.time.Clock;
import java.util.List;
import java.util.Set;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.event.AlertRaised;
import vn.edu.hcmut.emobility.core.exception.BusinessException;

/** Sinh/khử cảnh báo cho Dashboard (mục 2.3), đẩy realtime /topic/alerts sau khi commit. */
@Service
public class AlertService {

    public static final Set<AlertStatus> OPEN = Set.of(AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED);

    private final AlertRepository repo;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public AlertService(AlertRepository repo, ApplicationEventPublisher events, Clock clock) {
        this.repo = repo;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public void raise(AlertType type, Long hubId, String resourceType, Long resourceId, AlertSeverity severity, String message) {
        int inserted = repo.insertIfAbsent(type.name(), hubId, resourceType, resourceId, severity.name(), message);
        repo.findOpen(type.name(), hubId == null ? 0 : hubId, resourceType == null ? "" : resourceType, resourceId == null ? 0 : resourceId)
                .ifPresent(a -> {
                    if (inserted == 1) {
                        events.publishEvent(new AlertRaised(a.getId(), type.name(), hubId, severity.name(), message));
                    } else if (!a.getMessage().equals(message)) {
                        a.setMessage(message);
                    }
                });
    }

    /** Tự khử khi điều kiện không còn (ví dụ Hub hết quá tải). */
    @Transactional
    public void resolveIfOpen(AlertType type, Long hubId, String resourceType, Long resourceId) {
        repo.findOpen(type.name(), hubId == null ? 0 : hubId, resourceType == null ? "" : resourceType, resourceId == null ? 0 : resourceId)
                .ifPresent(a -> a.resolve(clock.instant()));
    }

    @Transactional
    public Alert acknowledge(Long id) {
        Alert a = get(id);
        a.acknowledge();
        return a;
    }

    @Transactional
    public Alert resolve(Long id) {
        Alert a = get(id);
        a.resolve(clock.instant());
        return a;
    }

    @Transactional(readOnly = true)
    public List<Alert> open() {
        return repo.findByStatusInOrderByIdDesc(OPEN);
    }

    @Transactional(readOnly = true)
    public List<Alert> openForHub(Long hubId) {
        return repo.findByHubIdAndStatusInOrderByIdDesc(hubId, OPEN);
    }

    public Alert get(Long id) {
        return repo.findById(id).orElseThrow(() -> BusinessException.notFound("Cảnh báo", id));
    }
}
