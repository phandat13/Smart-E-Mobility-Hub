package vn.edu.hcmut.emobility.rebalancing;

import java.util.EnumSet;
import java.util.Set;

public enum TransferItemStatus {
    /** Xe đã bị khóa tại Hub nguồn, chờ tài xế tới lấy. */
    LOCKED,
    /** Xe đã lên xe tải. */
    LOADED,
    /** Xe đã tới Hub đích. */
    DELIVERED,
    /** Xe bị gỡ khỏi lệnh, đã mở khóa. */
    REMOVED;

    /** Xe vẫn đang thuộc lệnh, chưa xong. */
    public static final Set<TransferItemStatus> MOVING = EnumSet.of(LOCKED, LOADED);
}
