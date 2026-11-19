package vn.edu.hcmut.emobility.rental;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class RentalDtos {
    private RentalDtos() {}

    public record ReserveRequest(@NotNull Long vehicleId, Long hubId) {}

    public record ExtensionView(Instant oldExpiresAt, Instant newExpiresAt, Instant at) {}

    public record ReservationView(Long id, String code, ReservationStatus status, boolean direct,
                                  Long vehicleId, String vehicleCode, String vehicleType, int batteryPercent, double rangeKm,
                                  Long hubId, String hubName, double hubLat, double hubLng,
                                  Instant reservedAt, Instant expiresAt, long secondsLeft, int extensionCount, int maxExtensions,
                                  String closeReason, Instant closedAt, List<ExtensionView> extensions, String tripCode, String message) {}

    public record AlternativeView(Long id, String code, String type, int batteryPercent, double rangeKm) {}

    /** RE05: quét QR trên xe (mã xe), kèm đơn đặt trước nếu có. */
    public record PickupRequest(@NotBlank @Size(max = 20) String vehicleCode, Long reservationId) {}

    public enum PickupState { STARTED, RECONCILING }

    public record PickupResult(PickupState state, String message, Long reservationId, TripView trip) {}

    public record TripView(Long id, String code, TripStatus status, ReturnMode returnMode,
                           Long vehicleId, String vehicleCode, String vehicleType, String vehicleModel,
                           Long startHubId, String startHubName, Long endHubId, String endHubName, String endSlotCode,
                           Instant startedAt, Instant endedAt, long durationMinutes, double distanceKm,
                           int startBattery, Integer endBattery, Integer currentBattery, BigDecimal cost, boolean rated,
                           String reconciliationNote, String offlineSecret) {}

    public enum ReturnState { COMPLETED, PENDING_RECONCILIATION }

    public record ReturnResult(ReturnState state, String message, TripView trip, String nextVehicleStatus) {}

    /** RE06-E2: trả xe offline – OTP tính trên thiết bị từ offlineSecret, đồng bộ khi có mạng. */
    public record OfflineReturnRequest(@NotBlank @Pattern(regexp = "^\\d{6}$", message = "OTP gồm 6 chữ số") String otp,
                                       @NotNull Instant clientEndedAt) {}

    /** AC06 */
    public record RatingRequest(@NotNull @Min(1) @Max(5) Integer vehicleStars, @NotNull @Min(1) @Max(5) Integer hubStars,
                                @Size(max = 500) String comment, boolean reportIssue, @Size(max = 50) String issueType,
                                @Size(max = 3) List<String> photoUrls, boolean safetyCritical) {}

    public record RatingResult(Long tripId, String incidentCode, String message) {}

    public record ActiveState(ReservationView reservation, TripView trip) {}
}
