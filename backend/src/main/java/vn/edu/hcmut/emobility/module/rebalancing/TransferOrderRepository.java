package vn.edu.hcmut.emobility.module.rebalancing;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;

public interface TransferOrderRepository extends JpaRepository<TransferOrder, Long> {

    Page<TransferOrder> findByStatus(TransferOrder.Status status, Pageable pageable);

    Optional<TransferOrder> findFirstByDriverIdAndStatusIn(Long driverId, Collection<TransferOrder.Status> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from TransferOrder o where o.id = :id")
    Optional<TransferOrder> findByIdForUpdate(Long id);

    /** Lệnh chờ lâu nhất, khóa kiểu SKIP LOCKED (giống DriverRepository) để hai tài xế không nhận trùng. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    Optional<TransferOrder> findFirstByStatusOrderByIdAsc(TransferOrder.Status status);
}
