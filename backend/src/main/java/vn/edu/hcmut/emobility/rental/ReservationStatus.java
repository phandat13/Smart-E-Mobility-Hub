package vn.edu.hcmut.emobility.rental;

public enum ReservationStatus {
    RESERVED, PICKUP_PENDING, PICKED_UP, COMPLETED, CANCELLED, EXPIRED;

    public boolean isOpen() { return this == RESERVED || this == PICKUP_PENDING; }
}
