package vn.edu.hcmut.emobility.hub;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HubRepository extends JpaRepository<Hub, Long> {
    List<Hub> findByStatusOrderByName(HubStatus status);
    List<Hub> findAllByOrderByName();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByCodeIgnoreCase(String code);

    /** Ghi nhận thời điểm nhận dữ liệu thiết bị gần nhất (không tăng version). */
    @org.springframework.data.jpa.repository.Modifying
    @Query("update Hub h set h.lastSyncAt = :now where h.id = :id")
    int touch(@Param("id") Long id, @Param("now") java.time.Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select h from Hub h where h.id = :id")
    Optional<Hub> lockById(@Param("id") Long id);
}
