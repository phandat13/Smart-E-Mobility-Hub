package vn.edu.hcmut.emobility.parking;

import java.math.BigDecimal;
import java.time.Instant;

public record BookingResponse(Long id, Long personalVehicleId, Long hubId, Long slotId, Long portId,
                              ServiceType serviceType, Instant startAt, Instant endAt, BookingStatus status,
                              String qrToken, Double energyKwh, BigDecimal cost) {

    public static BookingResponse from(SlotBooking b) {
        return new BookingResponse(b.getId(), b.getPersonalVehicleId(), b.getHubId(), b.getSlotId(), b.getPortId(),
                b.getServiceType(), b.getStartAt(), b.getEndAt(), b.getStatus(), b.getQrToken(), b.getEnergyKwh(),
                b.getCost());
    }
}
