package vn.edu.hcmut.emobility.fleet;

/**
 * Vòng đời xe dùng chung.
 * UNLOCK_RECONCILING / RETURN_RECONCILING: kết quả mở/khóa không xác định → chờ đối soát, KHÔNG về AVAILABLE (góp ý #5, #6).
 * PENDING_CHECK: chờ xác minh tình trạng thực tế trước khi mở lại (mục 2.3).
 */
public enum VehicleStatus {
    AVAILABLE, RESERVED, PICKUP_PENDING, UNLOCK_RECONCILING, IN_USE, RETURN_RECONCILING,
    PENDING_CHECK, NEEDS_CHARGE, CHARGING, TRANSFER_LOCKED, IN_TRANSIT, FAULTY, MAINTENANCE_LOCKED, OUT_OF_SERVICE;

    /** Xe đang phục vụ một hành trình/đơn – không được loại bỏ/khóa cho vận hành. */
    public boolean inCustomerUse() {
        return this == RESERVED || this == PICKUP_PENDING || this == UNLOCK_RECONCILING || this == IN_USE || this == RETURN_RECONCILING;
    }
}
