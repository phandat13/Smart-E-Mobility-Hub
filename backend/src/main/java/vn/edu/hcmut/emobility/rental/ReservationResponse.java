package vn.edu.hcmut.emobility.rental;

import java.time.Instant;

public record ReservationResponse(Long id, String code, Long vehicleId, Long hubId, ReservationStatus status,
                                  Instant reservedAt, Instant expiresAt, int extensionCount) {

    public static ReservationResponse from(Reservation r) {
        return new ReservationResponse(r.getId(), r.getCode(), r.getVehicleId(), r.getHubId(), r.getStatus(),
                r.getReservedAt(), r.getExpiresAt(), r.getExtensionCount());
    }
}
