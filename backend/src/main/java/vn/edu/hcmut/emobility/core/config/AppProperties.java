package vn.edu.hcmut.emobility.core.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Crypto crypto,
        @Valid @NotNull Account account,
        @Valid @NotNull Reservation reservation,
        @Valid @NotNull VehicleRules vehicle,
        @Valid @NotNull HubRules hub,
        @Valid @NotNull Booking booking,
        @Valid @NotNull Charging charging,
        @Valid @NotNull Reconciliation reconciliation,
        @Valid @NotNull Simulation simulation,
        @Valid @NotNull Iot iot,
        @Valid @NotNull Cors cors) {

    public record Jwt(@NotBlank String secret, @Positive long ttlMinutes) {}

    /** Khóa mã hóa dữ liệu định danh (NFR bảo mật). */
    public record Crypto(@NotBlank @Size(min = 16) String secret) {}

    public record Account(boolean autoVerify) {}

    /** RE01 giữ chỗ 15 phút; RE04 gia hạn +10 phút, tối đa 2 lần. */
    public record Reservation(@Positive int holdMinutes, @Positive int extendMinutes, @PositiveOrZero int maxExtensions) {}

    /** RE05 / mục 2.3: pin tối thiểu để phục vụ. */
    public record VehicleRules(@Min(0) @Max(100) int minBatteryPercent) {}

    /** Ngưỡng quá tải 90%, Hub mất kết nối sau N chu kỳ, ngưỡng mất cân đối. */
    public record HubRules(@DecimalMin("0.0") @DecimalMax("1.0") double overloadThreshold,
                           @Positive int offlineAfterMissedCycles,
                           @DecimalMin("0.0") @DecimalMax("1.0") double imbalanceThreshold) {}

    /** PV01/PV03/PV04: no-show 15 phút, cửa sổ check-in 15 phút, gia hạn trước giờ kết thúc ≥ 15 phút. */
    public record Booking(@Positive int noShowMinutes, @Positive int checkInGraceMinutes,
                          @PositiveOrZero int minExtendBeforeEndMinutes) {}

    /** SC01: ưu tiên = wBattery*(100-pin) + wDemand*nhu cầu; chu kỳ tính lại 10 phút. */
    public record Charging(@PositiveOrZero double wBattery, @PositiveOrZero double wDemand,
                           @Positive int recalcIntervalMinutes, @Min(50) @Max(100) int targetBattery) {}

    /** Góp ý #5, #6: số lần hỏi lại thiết bị, thời gian chờ bằng chứng vật lý khi trả xe offline. */
    public record Reconciliation(@Positive int maxAttempts, @Positive int evidenceTimeoutMinutes) {}

    /** Góp ý #14: token xem trước khi áp dụng khuyến nghị, ngưỡng lệch trạng thái thực tế. */
    public record Simulation(@Positive int previewTokenTtlSeconds, @DecimalMin("0.0") double driftThreshold) {}

    public record Iot(@NotBlank String mode, @Positive int telemetryIntervalSeconds,
                      @Positive int commandTimeoutSeconds, @NotBlank String apiKey) {
        public boolean simulated() { return "simulated".equalsIgnoreCase(mode); }
    }

    public record Cors(@NotNull List<String> allowedOrigins) {}
}
