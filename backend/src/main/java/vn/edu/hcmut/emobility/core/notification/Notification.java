package vn.edu.hcmut.emobility.core.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "notification")
public class Notification extends BaseEntity {
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false) private String type;
    @Column(nullable = false) private String title;
    @Column(nullable = false) private String body;
    @Column(name = "read_at") private Instant readAt;

    protected Notification() {}

    public Notification(Long userId, String type, String title, String body) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.body = body;
    }

    public Long getUserId() { return userId; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public Instant getReadAt() { return readAt; }
    public void markRead(Instant at) { if (readAt == null) readAt = at; }
}
