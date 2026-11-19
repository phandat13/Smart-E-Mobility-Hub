package vn.edu.hcmut.emobility.unit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static vn.edu.hcmut.emobility.rebalance.TransferItemStatus.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.edu.hcmut.emobility.rebalance.TransferItemStatus;
import vn.edu.hcmut.emobility.rebalance.TransferOrderStatus;
import vn.edu.hcmut.emobility.rebalance.TransferStatusPolicy;

/** Góp ý #9: trạng thái lệnh suy ra từ trạng thái từng xe. */
class TransferStatusPolicyTest {

    private static List<TransferItemStatus> of(int delivered, int failed, int inTransit) {
        List<TransferItemStatus> l = new ArrayList<>();
        l.addAll(Collections.nCopies(delivered, DELIVERED));
        l.addAll(Collections.nCopies(failed, FAILED));
        l.addAll(Collections.nCopies(inTransit, IN_TRANSIT));
        return l;
    }

    @Test
    void tenVehicles_eightDelivered_oneBroken_oneOnTheRoad_isPartiallyDelivered() {
        assertEquals(TransferOrderStatus.PARTIALLY_DELIVERED, TransferStatusPolicy.derive(of(8, 1, 1), true, false));
    }

    @Test
    void lastVehicleDelivered_withOneBroken_isCompletedWithIssues() {
        assertEquals(TransferOrderStatus.COMPLETED_WITH_ISSUES, TransferStatusPolicy.derive(of(9, 1, 0), true, false));
    }

    @Test
    void allDelivered_isCompleted() {
        assertEquals(TransferOrderStatus.COMPLETED, TransferStatusPolicy.derive(of(10, 0, 0), true, false));
    }

    @Test
    void beforeLoading_dependsOnDriver() {
        assertEquals(TransferOrderStatus.QUEUED, TransferStatusPolicy.derive(List.of(LOCKED, LOCKED), false, false));
        assertEquals(TransferOrderStatus.ASSIGNED, TransferStatusPolicy.derive(List.of(LOCKED, LOCKED), true, false));
        assertEquals(TransferOrderStatus.LOADING, TransferStatusPolicy.derive(List.of(LOADED, LOCKED), true, false));
        assertEquals(TransferOrderStatus.IN_TRANSIT, TransferStatusPolicy.derive(List.of(IN_TRANSIT, REMOVED), true, false));
    }

    @Test
    void counts() {
        TransferStatusPolicy.Counts c = TransferStatusPolicy.count(of(8, 1, 1));
        assertEquals(10, c.total());
        assertEquals(8, c.delivered());
        assertEquals(1, c.failed());
        assertEquals(1, c.inTransit());
    }
}
