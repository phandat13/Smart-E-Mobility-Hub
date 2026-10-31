package vn.edu.hcmut.emobility.vehicle;

public enum VehicleStatus {
    AVAILABLE,
    RESERVED,
    PICKUP_PENDING,
    IN_USE,
    PENDING_CHECK,
    NEEDS_CHARGE,
    CHARGING,
    TRANSFER_LOCKED,
    FAULTY,
    MAINTENANCE_LOCKED,
    OUT_OF_SERVICE;

    /** Xe đã bị RB (điều chuyển) hoặc MT (bảo trì) giữ. */
    public boolean lockedByOperation() {
        return this == TRANSFER_LOCKED || this == MAINTENANCE_LOCKED;
    }
}
