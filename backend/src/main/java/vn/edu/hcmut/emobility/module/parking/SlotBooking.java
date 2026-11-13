package vn.edu.hcmut.emobility.module.parking;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;
import vn.edu.hcmut.emobility.core.common.BaseEntity;
import vn.edu.hcmut.emobility.module.hub.ChargingPort;
import vn.edu.hcmut.emobility.module.hub.ParkingSlot;

@Entity
@Table(name = "slot_booking")
public class SlotBooking extends BaseEntity {

    public enum Status {
        BOOKED,
        IN_USE,
        COMPLETED,
        CANCELLED,
        EXPIRED;

        /** Đang giữ ô đỗ/cổng sạc: khớp điều kiện WHERE của ex_slot_no_overlap trong V1__init.sql. */
        public static final Set<Status> ACTIVE = EnumSet.of(BOOKED, IN_USE);
    }

    public enum ServiceType {
        PARK,
        CHARGE,
        BOTH;

        public boolean needsPort() { return this != PARK; }
    }

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
    private Status status;

    @Column(name = "qr_token", nullable = false, unique = true, length = 100)
    private String qrToken;

    @Column(name = "energy_kwh")
    private Double energyKwh;

    @Column(precision = 10, scale = 2)
    private BigDecimal cost;

    protected SlotBooking() {}

    /** PV01: giữ ô đỗ (và cổng sạc nếu cần) trong khung [startAt, endAt), kèm mã QR ngẫu nhiên. */
    public static SlotBooking book(Long ownerId, PersonalVehicle vehicle, ParkingSlot slot, ChargingPort port,
                                   ServiceType serviceType, Instant startAt, Instant endAt) {
        SlotBooking b = new SlotBooking();
        b.ownerId = ownerId;
        b.personalVehicleId = vehicle.getId();
        b.hubId = slot.getHubId();
        b.slotId = slot.getId();
        b.portId = port == null ? null : port.getId();
        b.serviceType = serviceType;
        b.startAt = startAt;
        b.endAt = endAt;
        b.status = Status.BOOKED;
        b.qrToken = UUID.randomUUID().toString();
        return b;
    }

    public void checkIn() { status = Status.IN_USE; }
    public void complete() { status = Status.COMPLETED; }
    public void cancel() { status = Status.CANCELLED; }
    public void expire() { status = Status.EXPIRED; }

    public Long getOwnerId() { return ownerId; }
    public Long getPersonalVehicleId() { return personalVehicleId; }
    public Long getHubId() { return hubId; }
    public Long getSlotId() { return slotId; }
    public Long getPortId() { return portId; }
    public ServiceType getServiceType() { return serviceType; }
    public Instant getStartAt() { return startAt; }
    public Instant getEndAt() { return endAt; }
    public Status getStatus() { return status; }
    public String getQrToken() { return qrToken; }
    public Double getEnergyKwh() { return energyKwh; }
    public BigDecimal getCost() { return cost; }
}
