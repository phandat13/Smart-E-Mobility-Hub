package vn.edu.hcmut.emobility.personal;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class PersonalDtos {
    private PersonalDtos() {}

    /** PV02 */
    public record PersonalVehicleRequest(
            @NotBlank @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9 .-]{4,20}$", message = "Biển số không hợp lệ") String plateNumber,
            @NotBlank @Pattern(regexp = "^(E_BIKE|E_SCOOTER|E_MOTORBIKE)$", message = "Loại xe không hợp lệ") String type,
            @Size(max = 50) String model,
            @NotNull @DecimalMin(value = "0.1", message = "Dung lượng pin phải lớn hơn 0") @DecimalMax("50") Double batteryKwh,
            @NotBlank @Pattern(regexp = "^(TYPE_2|CCS2|J1772|STD_220V)$", message = "Chuẩn cắm sạc không hợp lệ") String connectorType) {}

    public record PersonalVehicleView(Long id, String plateNumber, String type, String model, double batteryKwh, String connectorType,
                                      boolean hasActiveBooking) {}

    /** PV01 bước 1–3: kiểm tra trước khi xác nhận (không giữ tài nguyên). */
    public record QuoteRequest(@NotNull Long hubId, @NotNull Long personalVehicleId, @NotNull ServiceType serviceType,
                               @NotNull Instant startAt, @NotNull Instant endAt) {}

    public record SlotOption(Long id, String code) {}

    public record PortOption(Long id, String code, double powerKw, String connectorType) {}

    public record QuoteResult(String hubName, ServiceType serviceType, Instant startAt, Instant endAt,
                              List<SlotOption> freeSlots, List<PortOption> freePorts, Long suggestedSlotId, Long suggestedPortId,
                              BigDecimal estimatedCost, String demandLevel, Instant checkedAt) {}

    /** PV01 bước 5–6: xác nhận – giữ tài nguyên trong MỘT giao dịch. */
    public record ConfirmRequest(@NotNull Long hubId, @NotNull Long personalVehicleId, @NotNull ServiceType serviceType,
                                 @NotNull Instant startAt, @NotNull Instant endAt, Long slotId, Long portId) {}

    public record SessionView(Long id, String status, Instant startedAt, Instant endedAt, double energyKwh) {}

    public record BookingView(Long id, String code, BookingStatus status, ServiceType serviceType,
                              Long hubId, String hubName, Long slotId, String slotCode, Long portId, String portCode, Double portPowerKw,
                              Long personalVehicleId, String plateNumber, Instant startAt, Instant endAt, String qrToken,
                              Instant checkedInAt, Instant chargingStoppedAt, Instant vehicleLeftAt, Double energyKwh,
                              BigDecimal cost, BigDecimal estimatedCost, String note, SessionView charging, String message) {}

    /** PV04 */
    public record ExtendQuote(int minutes, Instant currentEndAt, Instant newEndAt, boolean available, String reason, BigDecimal extraCost) {}

    public record ExtendRequest(@NotNull @Min(15) @Max(240) Integer minutes) {}

    /** PV03 – thiết bị quét tại Hub gửi mã QR (+ biển số nhận diện được, nếu có). */
    public record ScanRequest(@NotBlank String qrToken, String plateNumber) {}
}
