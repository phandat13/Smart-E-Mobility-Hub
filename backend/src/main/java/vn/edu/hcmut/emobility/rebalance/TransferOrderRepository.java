package vn.edu.hcmut.emobility.rebalance;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransferOrderRepository extends JpaRepository<TransferOrder, Long> {
    List<TransferOrder> findTop100ByOrderByIdDesc();
    List<TransferOrder> findByDriverIdOrderByIdDesc(Long driverId);
    List<TransferOrder> findByStatusOrderByIdAsc(TransferOrderStatus status);
    long countByDriverIdAndStatusIn(Long driverId, Collection<TransferOrderStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from TransferOrder o where o.id = :id")
    Optional<TransferOrder> lockById(@Param("id") Long id);
}
