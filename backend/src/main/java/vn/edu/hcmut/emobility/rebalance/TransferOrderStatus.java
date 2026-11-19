package vn.edu.hcmut.emobility.rebalance;

/** Trạng thái lệnh được SUY RA từ trạng thái các xe (xem TransferStatusPolicy). */
public enum TransferOrderStatus {
    QUEUED, ASSIGNED, LOADING, IN_TRANSIT, PARTIALLY_DELIVERED, COMPLETED, COMPLETED_WITH_ISSUES, CANCELLED;

    public boolean open() { return this != COMPLETED && this != COMPLETED_WITH_ISSUES && this != CANCELLED; }
}
