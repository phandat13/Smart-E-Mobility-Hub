package vn.edu.hcmut.emobility.module.hub;

import java.util.EnumSet;
import java.util.Set;

/** Trạng thái chung của ô đỗ và cổng sạc. */
public enum ResourceStatus {
    AVAILABLE,
    HELD,
    OCCUPIED,
    PENDING_CHECK,
    FAULTY,
    MAINTENANCE,
    DISABLED;

    /** Hỏng / bảo trì / tắt: không được nhận đặt chỗ mới. */
    public static final Set<ResourceStatus> OUT_OF_ORDER = EnumSet.of(FAULTY, MAINTENANCE, DISABLED);
}
