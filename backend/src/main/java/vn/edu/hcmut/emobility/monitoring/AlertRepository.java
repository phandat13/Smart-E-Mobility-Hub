package vn.edu.hcmut.emobility.monitoring;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    /** Chèn nếu chưa có cảnh báo chưa xử lý cùng khóa – không làm hỏng giao dịch gọi khi trùng. */
    @Modifying
    @Query(value = "insert into alert (type, hub_id, resource_type, resource_id, severity, status, message) "
            + "values (:type, :hubId, :rt, :rid, :severity, 'OPEN', :message) "
            + "on conflict (type, coalesce(hub_id, 0), coalesce(resource_type, ''), coalesce(resource_id, 0)) "
            + "where status <> 'RESOLVED' do nothing", nativeQuery = true)
    int insertIfAbsent(@Param("type") String type, @Param("hubId") Long hubId, @Param("rt") String resourceType,
                       @Param("rid") Long resourceId, @Param("severity") String severity, @Param("message") String message);

    @Query(value = "select * from alert where type = :type and coalesce(hub_id, 0) = :hubId and coalesce(resource_type, '') = :rt "
            + "and coalesce(resource_id, 0) = :rid and status <> 'RESOLVED'", nativeQuery = true)
    Optional<Alert> findOpen(@Param("type") String type, @Param("hubId") long hubId, @Param("rt") String resourceType, @Param("rid") long resourceId);

    List<Alert> findByStatusInOrderByIdDesc(Collection<AlertStatus> statuses);
    List<Alert> findByHubIdAndStatusInOrderByIdDesc(Long hubId, Collection<AlertStatus> statuses);
    List<Alert> findByTypeAndStatusIn(AlertType type, Collection<AlertStatus> statuses);
    List<Alert> findTop50ByOrderByIdDesc();
}
