package vn.edu.hcmut.emobility.iot;

import jakarta.validation.constraints.NotNull;
import vn.edu.hcmut.emobility.core.iot.DeviceType;
import vn.edu.hcmut.emobility.core.iot.LockState;

/**
 * Bản tin trạng thái thiết bị (chu kỳ ≤ 30 giây). Trường null = không thay đổi.
 * VEHICLE: batteryPercent, lockState, errorCode, hubId, distanceKm. SLOT: occupied (+vehicleId nếu là xe dùng chung).
 * PORT: pluggedVehicleId / unplugged, powerOn, errorCode.
 */
public record TelemetryMessage(@NotNull DeviceType deviceType, @NotNull Long deviceId, Long hubId, Integer batteryPercent,
                               LockState lockState, String errorCode, Boolean clearError, Double distanceKm,
                               Boolean occupied, Long vehicleId, Boolean powerOn, Boolean unplugged) {

    public static TelemetryMessage vehicle(Long id, Long hubId, Integer battery, LockState lock, Double km) {
        return new TelemetryMessage(DeviceType.VEHICLE, id, hubId, battery, lock, null, null, km, null, null, null, null);
    }

    public static TelemetryMessage slot(Long id, boolean occupied, Long vehicleId) {
        return new TelemetryMessage(DeviceType.SLOT, id, null, null, null, null, null, null, occupied, vehicleId, null, null);
    }
}
