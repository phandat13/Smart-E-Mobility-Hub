package vn.edu.hcmut.emobility.core.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Reservation reservation,
        @Valid @NotNull VehicleRules vehicle,
        @Valid @NotNull HubRules hub,
        @Valid @NotNull Booking booking,
        @Valid @NotNull Charging charging,
        @Valid @NotNull Iot iot,
        @Valid @NotNull Cors cors) {

    public record Jwt(@NotBlank String secret, @Positive long ttlMinutes) {}

    /** RE01 giữ chỗ 15 phút; RE04 gia hạn +10 phút, tối đa 2 lần. */
    public record Reservation(@Positive int holdMinutes, @Positive int extendMinutes, @PositiveOrZero int maxExtensions) {
        public Duration holdDuration() { return Duration.ofMinutes(holdMinutes); }
        public Duration extendDuration() { return Duration.ofMinutes(extendMinutes); }
        public boolean canExtend(int extensionCount) { return extensionCount < maxExtensions; }
    }

    /** RE05 / mục 2.3: pin tối thiểu để phục vụ. */
    public record VehicleRules(@Min(0) @Max(100) int minBatteryPercent) {}

    /** Ngưỡng quá tải 90%, Hub mất kết nối sau N chu kỳ, ngưỡng mất cân đối. */
    public record HubRules(@DecimalMin("0.0") @DecimalMax("1.0") double overloadThreshold,
                           @Positive int offlineAfterMissedCycles,
                           @DecimalMin("0.0") @DecimalMax("1.0") double imbalanceThreshold) {}

    /** PV01/PV03: giữ chỗ 15 phút, cửa sổ check-in ±15 phút. */
    public record Booking(@Positive int noShowMinutes, @Positive int checkInGraceMinutes) {
        public Duration noShowDuration() { return Duration.ofMinutes(noShowMinutes); }
        public Duration checkInGrace() { return Duration.ofMinutes(checkInGraceMinutes); }
    }

    /** SC01: trọng số ưu tiên = wBattery*(100-pin) + wDemand*nhu cầu; chu kỳ 10 phút. */
    public record Charging(@PositiveOrZero double wBattery, @PositiveOrZero double wDemand,
                           @Positive int recalcIntervalMinutes) {}

    public record Iot(@NotBlank String mode, @Positive int telemetryIntervalSeconds,
                      @Positive int commandTimeoutSeconds, @NotBlank String apiKey) {
        public boolean simulated() { return "simulated".equalsIgnoreCase(mode); }
    }

    public record Cors(@NotNull List<String> allowedOrigins) {}
}
