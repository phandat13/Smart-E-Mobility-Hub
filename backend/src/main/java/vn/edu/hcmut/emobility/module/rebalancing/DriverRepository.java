package vn.edu.hcmut.emobility.module.rebalancing;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.QueryHints;

public interface DriverRepository extends JpaRepository<Driver, Long> {

    Optional<Driver> findByUserId(Long userId);

    /**
     * SELECT ... FOR UPDATE SKIP LOCKED: lấy 1 tài xế rảnh và khóa lại. Tài xế đang bị transaction khác
     * khóa thì bỏ qua, nên hai lệnh tạo cùng lúc không bao giờ nhận cùng một tài xế.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    Optional<Driver> findFirstByStatusOrderByIdAsc(Driver.Status status);
}
