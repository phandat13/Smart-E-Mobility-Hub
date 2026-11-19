package vn.edu.hcmut.emobility.personal;

/**
 * Góp ý #8 – check-out theo thứ tự vật lý:
 * IN_USE → CHECKOUT_REQUESTED (đã yêu cầu dừng sạc) → AWAITING_EXIT (thiết bị xác nhận ngắt điện an toàn)
 * → COMPLETED (cảm biến xác nhận xe rời vị trí, mới giải phóng ô/cổng).
 */
public enum BookingStatus {
    BOOKED, IN_USE, CHECKOUT_REQUESTED, AWAITING_EXIT, COMPLETED, CANCELLED, EXPIRED;

    public boolean holdsResources() {
        return this == BOOKED || this == IN_USE || this == CHECKOUT_REQUESTED || this == AWAITING_EXIT;
    }
}
