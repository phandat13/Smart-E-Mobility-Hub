package vn.edu.hcmut.emobility.rebalance;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransferItemRepository extends JpaRepository<TransferItem, Long> {
    List<TransferItem> findByOrderIdOrderById(Long orderId);
    Optional<TransferItem> findByOrderIdAndVehicleId(Long orderId, Long vehicleId);
    Optional<TransferItem> findFirstByVehicleIdAndStatusIn(Long vehicleId, Collection<TransferItemStatus> statuses);
}
