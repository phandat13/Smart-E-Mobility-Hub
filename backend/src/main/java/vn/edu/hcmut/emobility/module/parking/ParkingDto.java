package vn.edu.hcmut.emobility.module.parking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

/** Toàn bộ dữ liệu JSON vào/ra của module PV. */
public final class ParkingDto {

    private ParkingDto() {}

    // ---------- Xe cá nhân ----------

    public record RegisterVehicleRequest(@NotBlank @Size(max = 20) String plateNumber,
                                         @NotBlank @Size(max = 20) String type,
                                         @Positive double batteryKwh,
                                         @NotBlank @Size(max = 20) String connectorType) {}

    public record VehicleResponse(Long id, String plateNumber, String type, double batteryKwh, String connectorType) {

        public static VehicleResponse from(PersonalVehicle v) {
            return new VehicleResponse(v.getId(), v.getPlateNumber(), v.getType(), v.getBatteryKwh(),
                    v.getConnectorType());
        }
    }

    // ---------- Đặt chỗ ----------

    public record BookRequest(@NotNull Long personalVehicleId,
                              @NotNull Long hubId,
                              @NotNull SlotBooking.ServiceType serviceType,
                              @NotNull Instant startAt,
                              @NotNull Instant endAt) {}

    public record CheckInRequest(@NotBlank String qrToken) {}

    public record BookingResponse(Long id, Long personalVehicleId, Long hubId, Long slotId, Long portId,
                                  SlotBooking.ServiceType serviceType, Instant startAt, Instant endAt,
                                  SlotBooking.Status status, String qrToken, Double energyKwh, BigDecimal cost) {

        public static BookingResponse from(SlotBooking b) {
            return new BookingResponse(b.getId(), b.getPersonalVehicleId(), b.getHubId(), b.getSlotId(),
                    b.getPortId(), b.getServiceType(), b.getStartAt(), b.getEndAt(), b.getStatus(), b.getQrToken(),
                    b.getEnergyKwh(), b.getCost());
        }
    }
}
