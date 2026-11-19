package vn.edu.hcmut.emobility.charging;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class ChargingDtos {
    private ChargingDtos() {}

    public record GenerateRequest(@NotNull Long hubId, @NotNull @Min(1) @Max(24) Integer horizonHours) {}

    public record ItemView(Long id, Long vehicleId, String vehicleCode, int batteryPercent, Long portId, String portCode, double powerKw,
                           Instant startAt, Instant endAt, double priority, int targetBattery, ScheduleItemStatus status,
                           String sessionStatus, Instant sessionStartedAt) {}

    public record UnmetView(Long vehicleId, String code, int battery, String reason) {}

    public record ScheduleView(Long id, String code, Long hubId, String hubName, ScheduleStatus status, Instant horizonStart, Instant horizonEnd,
                               Instant confirmedAt, String confirmedBy, List<ItemView> items, List<UnmetView> unmet,
                               int vehiclesNeedingCharge, int portsAvailable, String message) {}

    /** SC02: thay đổi thời gian, cổng hoặc mức ưu tiên của một mục lịch. */
    public record AdjustRequest(Long portId, Instant startAt, Instant endAt, Double priority) {}

    public record AdjustCheck(boolean ok, List<String> conflicts, List<String> warnings) {}
}
