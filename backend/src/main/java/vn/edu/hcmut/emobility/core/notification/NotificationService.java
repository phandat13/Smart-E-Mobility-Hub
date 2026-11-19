package vn.edu.hcmut.emobility.core.notification;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.event.UserNotification;
import vn.edu.hcmut.emobility.core.exception.BusinessException;

/** Thông báo trong ứng dụng: lưu DB + đẩy realtime qua WebSocket sau khi commit. */
@Service
public class NotificationService {

    private final NotificationRepository repo;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public NotificationService(NotificationRepository repo, ApplicationEventPublisher events, Clock clock) {
        this.repo = repo;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public void notify(Long userId, String type, String title, String body) {
        if (userId == null) return;
        Notification n = repo.save(new Notification(userId, type, title, body));
        events.publishEvent(new UserNotification(userId, type, title, body, Map.of("id", n.getId())));
    }

    @Transactional(readOnly = true)
    public List<Notification> latest(Long userId) {
        return repo.findTop30ByUserIdOrderByIdDesc(userId);
    }

    @Transactional(readOnly = true)
    public long unread(Long userId) {
        return repo.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        Notification n = repo.findById(id).orElseThrow(() -> BusinessException.notFound("Thông báo", id));
        if (!n.getUserId().equals(userId)) throw BusinessException.notFound("Thông báo", id);
        n.markRead(clock.instant());
    }

    @Transactional
    public void markAllRead(Long userId) {
        repo.findByUserIdAndReadAtIsNull(userId).forEach(n -> n.markRead(clock.instant()));
    }
}
