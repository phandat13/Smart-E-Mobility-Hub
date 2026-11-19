package vn.edu.hcmut.emobility.core.notification;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.core.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    public record NotificationView(Long id, String type, String title, String body, Instant createdAt, boolean read) {}

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> list() {
        Long uid = CurrentUser.require().id();
        List<NotificationView> items = service.latest(uid).stream()
                .map(n -> new NotificationView(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getCreatedAt(), n.getReadAt() != null))
                .toList();
        return Map.of("items", items, "unread", service.unread(uid));
    }

    @PostMapping("/{id}/read")
    public void read(@PathVariable Long id) {
        service.markRead(CurrentUser.require().id(), id);
    }

    @PostMapping("/read-all")
    public void readAll() {
        service.markAllRead(CurrentUser.require().id());
    }
}
