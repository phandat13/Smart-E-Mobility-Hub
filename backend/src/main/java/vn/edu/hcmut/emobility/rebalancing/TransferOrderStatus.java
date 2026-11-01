package vn.edu.hcmut.emobility.rebalancing;

import java.util.EnumSet;
import java.util.Set;

public enum TransferOrderStatus {
    /** Chưa có tài xế rảnh, đang xếp hàng chờ. */
    PENDING,
    /** Đã giao cho tài xế, chưa chất xe nào. */
    ASSIGNED,
    /** Đã chất ít nhất 1 xe lên. */
    IN_PROGRESS,
    COMPLETED,
    CANCELLED;

    public static final Set<TransferOrderStatus> ACTIVE = EnumSet.of(PENDING, ASSIGNED, IN_PROGRESS);
    public static final Set<TransferOrderStatus> ON_ROAD = EnumSet.of(ASSIGNED, IN_PROGRESS);
}
