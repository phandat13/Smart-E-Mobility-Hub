package vn.edu.hcmut.emobility.rebalancing;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TransferItemRepository extends JpaRepository<TransferItem, Long> {

    List<TransferItem> findByOrderId(Long orderId);

    List<TransferItem> findByOrderIdIn(Collection<Long> orderIds);

    Optional<TransferItem> findByOrderIdAndVehicleId(Long orderId, Long vehicleId);

    /** Số xe đang trên đường tới Hub (để kiểm tra sức chứa Hub đích). */
    @Query("""
            select count(i) from TransferItem i, TransferOrder o
            where i.orderId = o.id and o.targetHubId = :hubId
              and o.status in :activeOrders and i.status in :movingItems
            """)
    long countIncoming(Long hubId, Collection<TransferOrderStatus> activeOrders,
                       Collection<TransferItemStatus> movingItems);
}
