package vn.edu.hcmut.emobility.rebalance;

/** Góp ý #9: trạng thái theo từng xe trong lệnh điều chuyển. */
public enum TransferItemStatus {
    LOCKED, LOADED, IN_TRANSIT, DELIVERED, FAILED, REMOVED;

    public boolean terminal() { return this == DELIVERED || this == FAILED || this == REMOVED; }
}
