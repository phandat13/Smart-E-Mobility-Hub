package vn.edu.hcmut.emobility.rebalance;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findByUserId(Long userId);
    List<Driver> findAllByOrderById();

    /** Tài xế rảnh đầu tiên, khóa dòng để hai lệnh không cùng nhận một tài xế. */
    @Query(value = "select * from driver where status = 'FREE' order by id limit 1 for update skip locked", nativeQuery = true)
    Optional<Driver> lockFirstFree();
}
