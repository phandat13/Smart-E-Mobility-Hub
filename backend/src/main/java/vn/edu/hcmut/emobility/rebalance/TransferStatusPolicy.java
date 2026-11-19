package vn.edu.hcmut.emobility.rebalance;

import java.util.Collection;

/**
 * Góp ý #9: trạng thái lệnh điều chuyển được SUY RA từ trạng thái từng xe,
 * thay vì một trạng thái chung Completed/Failed. Ví dụ 10 xe: 8 đã giao, 1 hỏng, 1 còn trên đường
 * → PARTIALLY_DELIVERED; khi xe cuối giao xong → COMPLETED_WITH_ISSUES.
 */
public final class TransferStatusPolicy {

    private TransferStatusPolicy() {}

    public record Counts(int total, int locked, int loaded, int inTransit, int delivered, int failed, int removed) {}

    public static Counts count(Collection<TransferItemStatus> items) {
        int l = 0, lo = 0, it = 0, d = 0, f = 0, r = 0;
        for (TransferItemStatus s : items) {
            switch (s) {
                case LOCKED -> l++;
                case LOADED -> lo++;
                case IN_TRANSIT -> it++;
                case DELIVERED -> d++;
                case FAILED -> f++;
                case REMOVED -> r++;
            }
        }
        return new Counts(items.size(), l, lo, it, d, f, r);
    }

    public static TransferOrderStatus derive(Collection<TransferItemStatus> items, boolean hasDriver, boolean cancelled) {
        if (cancelled) return TransferOrderStatus.CANCELLED;
        Counts c = count(items);
        if (c.total() == 0) return TransferOrderStatus.CANCELLED;
        boolean allTerminal = c.locked() == 0 && c.loaded() == 0 && c.inTransit() == 0;
        if (allTerminal) {
            if (c.delivered() == c.total()) return TransferOrderStatus.COMPLETED;
            if (c.delivered() == 0 && c.failed() == 0) return TransferOrderStatus.CANCELLED;
            return TransferOrderStatus.COMPLETED_WITH_ISSUES;
        }
        if (c.delivered() > 0) return TransferOrderStatus.PARTIALLY_DELIVERED;
        if (c.inTransit() > 0) return TransferOrderStatus.IN_TRANSIT;
        if (c.loaded() > 0) return TransferOrderStatus.LOADING;
        return hasDriver ? TransferOrderStatus.ASSIGNED : TransferOrderStatus.QUEUED;
    }
}
