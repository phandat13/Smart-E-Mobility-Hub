package vn.edu.hcmut.emobility.parking;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.BaseEntity;
import vn.edu.hcmut.emobility.hub.ChargingPort;
import vn.edu.hcmut.emobility.hub.ParkingSlot;

@Entity
@Table(name = "slot_booking")
public class SlotBooking extends BaseEntity {

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "personal_vehicle_id", nullable = false)
    private Long personalVehicleId;

    @Column(name = "hub_id", nullable = false)
    private Long hubId;

    @Column(name = "slot_id", nullable = false)
    private Long slotId;

    @Column(name = "port_id")
    private Long portId;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, length = 20)
    private ServiceType serviceType;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookingStatus status;

    @Column(name = "qr_token", nullable = false, unique = true, length = 100)
    private String qrToken;

    @Column(name = "energy_kwh")
    private Double energyKwh;

    @Column(precision = 10, scale = 2)
    private BigDecimal cost;

    protected SlotBooking() {}

    /** PV01: giữ ô đỗ (và cổng sạc nếu cần) trong khung [startAt, endAt). */
    public static SlotBooking book(Long ownerId, PersonalVehicle vehicle, ParkingSlot slot, ChargingPort port,
                                   ServiceType serviceType, Instant startAt, Instant endAt, String qrToken) {
        SlotBooking b = new SlotBooking();
        b.ownerId = ownerId;
        b.personalVehicleId = vehicle.getId();
        b.hubId = slot.getHubId();
        b.slotId = slot.getId();
        b.portId = port == null ? null : port.getId();
        b.serviceType = serviceType;
        b.startAt = startAt;
        b.endAt = endAt;
        b.status = BookingStatus.BOOKED;
        b.qrToken = qrToken;
        return b;
    }

    public void checkIn() { status = BookingStatus.IN_USE; }
    public void complete() { status = BookingStatus.COMPLETED; }
    public void cancel() { status = BookingStatus.CANCELLED; }
    public void expire() { status = BookingStatus.EXPIRED; }

    public Long getOwnerId() { return ownerId; }
    public Long getPersonalVehicleId() { return personalVehicleId; }
    public Long getHubId() { return hubId; }
    public Long getSlotId() { return slotId; }
    public Long getPortId() { return portId; }
    public ServiceType getServiceType() { return serviceType; }
    public Instant getStartAt() { return startAt; }
    public Instant getEndAt() { return endAt; }
    public BookingStatus getStatus() { return status; }
    public String getQrToken() { return qrToken; }
    public Double getEnergyKwh() { return energyKwh; }
    public BigDecimal getCost() { return cost; }
}
