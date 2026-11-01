package vn.edu.hcmut.emobility.parking;

import java.util.EnumSet;
import java.util.Set;

public enum BookingStatus {
    BOOKED,
    IN_USE,
    COMPLETED,
    CANCELLED,
    EXPIRED;

    /** Đang giữ ô đỗ/cổng sạc: khớp điều kiện WHERE của ex_slot_no_overlap trong V1__init.sql. */
    public static final Set<BookingStatus> ACTIVE = EnumSet.of(BOOKED, IN_USE);
}
