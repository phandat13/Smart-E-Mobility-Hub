package vn.edu.hcmut.emobility.core.notification;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop30ByUserIdOrderByIdDesc(Long userId);
    long countByUserIdAndReadAtIsNull(Long userId);
    List<Notification> findByUserIdAndReadAtIsNull(Long userId);
}
