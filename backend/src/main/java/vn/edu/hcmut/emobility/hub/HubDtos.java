package vn.edu.hcmut.emobility.hub;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class HubDtos {
    private HubDtos() {}

    /**
     * Góp ý #1: mọi dữ liệu trạng thái đều kèm thời điểm cập nhật cuối (dataUpdatedAt) và cờ stale;
     * giao diện hiển thị "Cập nhật lúc …". Thao tác thật luôn kiểm tra lại tại thời điểm xác nhận.
     */
    public record HubSummary(Long id, String code, String name, String address, String area, HubType type, HubStatus status,
                             double latitude, double longitude,
                             long availableVehicles, Integer avgBattery, long totalVehicles,
                             long freeSharedSlots, long sharedCapacity, long freePersonalSlots, long personalCapacity,
                             long freePorts, long totalPorts, long faultyPorts,
                             Instant dataUpdatedAt, boolean stale, Instant servedAt) {}

    public record HubVehicleView(Long id, String code, String type, String model, int batteryPercent, double rangeKm, String status) {}

    public record HubDetail(HubSummary hub, List<HubVehicleView> vehicles) {}

    public record SearchResult(List<HubSummary> items, List<HubSummary> suggestions, Instant servedAt, int refreshSeconds) {}

    public record SlotView(Long id, String code, SlotKind kind, SlotStatus status, String vehicleCode, boolean freeInWindow) {}

    public record PortView(Long id, String code, double powerKw, String connectorType, PortStatus status,
                           boolean disableAfterSession, boolean freeInWindow) {}

    // ----- MO03
    public record HubRequest(@NotBlank @Size(max = 20) @Pattern(regexp = "^[A-Z0-9-]+$", message = "Mã Hub gồm chữ in hoa, số, gạch ngang") String code,
                             @NotBlank @Size(max = 100) String name,
                             @Size(max = 255) String address,
                             @Size(max = 50) String area,
                             @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
                             @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
                             @NotNull HubType type,
                             @NotNull @Positive(message = "Sức chứa phải lớn hơn 0") Integer sharedCapacity,
                             @NotNull @PositiveOrZero Integer personalCapacity,
                             @PositiveOrZero Integer initialPorts) {}

    public record DeactivateRequest(@NotBlank(message = "Vui lòng nhập lý do ngưng") @Size(max = 255) String reason) {}

    // ----- MO04
    public record PortRequest(@NotBlank @Size(max = 20) String code,
                              @NotNull @DecimalMin(value = "0.5", message = "Công suất tối thiểu 0.5 kW") @DecimalMax(value = "150", message = "Công suất tối đa 150 kW") Double powerKw,
                              @NotBlank @Pattern(regexp = "^(TYPE_2|CCS2|J1772|STD_220V)$", message = "Loại đầu sạc không hợp lệ") String connectorType) {}

    public record PortStatusRequest(@NotNull PortStatus status, boolean force) {}
}
