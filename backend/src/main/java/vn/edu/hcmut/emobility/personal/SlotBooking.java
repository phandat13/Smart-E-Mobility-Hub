package vn.edu.hcmut.emobility.personal;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "slot_booking")
public class SlotBooking extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(name = "owner_id", nullable = false) private Long ownerId;
    @Column(name = "personal_vehicle_id", nullable = false) private Long personalVehicleId;
    @Column(name = "hub_id", nullable = false) private Long hubId;
    @Column(name = "slot_id") private Long slotId;
    @Column(name = "port_id") private Long portId;
    @Enumerated(EnumType.STRING) @Column(name = "service_type", nullable = false) private ServiceType serviceType;
    @Column(name = "start_at", nullable = false) private Instant startAt;
    @Column(name = "end_at", nullable = false) private Instant endAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private BookingStatus status;
    @Column(name = "qr_token", nullable = false, unique = true) private String qrToken;
    @Column(name = "checked_in_at") private Instant checkedInAt;
    @Column(name = "charging_stopped_at") private Instant chargingStoppedAt;
    @Column(name = "vehicle_left_at") private Instant vehicleLeftAt;
    @Column(name = "energy_kwh") private Double energyKwh;
    private BigDecimal cost;
    private String note;

    protected SlotBooking() {}

    public SlotBooking(String code, Long ownerId, Long personalVehicleId, Long hubId, Long slotId, Long portId,
                       ServiceType serviceType, Instant startAt, Instant endAt, String qrToken) {
        this.code = code;
        this.ownerId = ownerId;
        this.personalVehicleId = personalVehicleId;
        this.hubId = hubId;
        this.slotId = slotId;
        this.portId = portId;
        this.serviceType = serviceType;
        this.startAt = startAt;
        this.endAt = endAt;
        this.qrToken = qrToken;
        this.status = BookingStatus.BOOKED;
    }

    public String getCode() { return code; }
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
    public Instant getCheckedInAt() { return checkedInAt; }
    public Instant getChargingStoppedAt() { return chargingStoppedAt; }
    public Instant getVehicleLeftAt() { return vehicleLeftAt; }
    public Double getEnergyKwh() { return energyKwh; }
    public BigDecimal getCost() { return cost; }
    public String getNote() { return note; }
    public boolean wantsCharging() { return serviceType != ServiceType.PARK; }

    public void setStatus(BookingStatus status) { this.status = status; }
    public void setNote(String note) { this.note = note; }
    public void checkIn(Instant at) { this.checkedInAt = at; this.status = BookingStatus.IN_USE; }
    public void chargingStopped(Instant at, double kwh) { this.chargingStoppedAt = at; this.energyKwh = kwh; this.status = BookingStatus.AWAITING_EXIT; }
    public void complete(Instant leftAt, BigDecimal cost) { this.vehicleLeftAt = leftAt; this.cost = cost; this.status = BookingStatus.COMPLETED; }
    public void extendTo(Instant newEnd) { this.endAt = newEnd; }
    public void movePort(Long newPortId) { this.portId = newPortId; }

    /** Góp ý #15: cổng sạc hỏng, không tìm được cổng thay thế → giữ chỗ đỗ, hủy phần sạc. */
    public void dropCharging(String reason) {
        this.portId = null;
        if (serviceType == ServiceType.BOTH) serviceType = ServiceType.PARK;
        this.note = reason;
    }
}
