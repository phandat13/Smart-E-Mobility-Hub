package vn.edu.hcmut.emobility.module.rental;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/** Toàn bộ dữ liệu JSON vào/ra của module RE. */
public final class RentalDto {

    private RentalDto() {}

    public record ReserveRequest(@NotNull Long vehicleId) {}

    public record ReservationResponse(Long id, String code, Long vehicleId, Long hubId, Reservation.Status status,
                                      Instant reservedAt, Instant expiresAt, int extensionCount) {

        public static ReservationResponse from(Reservation r) {
            return new ReservationResponse(r.getId(), r.getCode(), r.getVehicleId(), r.getHubId(), r.getStatus(),
                    r.getReservedAt(), r.getExpiresAt(), r.getExtensionCount());
        }
    }
}
