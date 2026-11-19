package vn.edu.hcmut.emobility.charging;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

/** Phiên sạc THỰC TẾ: chỉ ACTIVE khi thiết bị xác nhận đã cấp điện cho đúng xe tại đúng cổng (góp ý #11). */
@Entity
@Table(name = "charging_session")
public class ChargingSession extends VersionedEntity {
    @Column(name = "port_id", nullable = false) private Long portId;
    @Column(name = "vehicle_id") private Long vehicleId;
    @Column(name = "slot_booking_id") private Long slotBookingId;
    @Column(name = "schedule_item_id") private Long scheduleItemId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private SessionStatus status;
    @Column(name = "requested_at", nullable = false) private Instant requestedAt;
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "ended_at") private Instant endedAt;
    @Column(name = "energy_kwh", nullable = false) private double energyKwh;
    @Column(name = "start_battery") private Short startBattery;
    @Column(name = "end_battery") private Short endBattery;

    protected ChargingSession() {}

    public ChargingSession(Long portId, Long vehicleId, Long slotBookingId, Long scheduleItemId, Instant requestedAt, Integer startBattery) {
        this.portId = portId;
        this.vehicleId = vehicleId;
        this.slotBookingId = slotBookingId;
        this.scheduleItemId = scheduleItemId;
        this.requestedAt = requestedAt;
        this.startBattery = startBattery == null ? null : startBattery.shortValue();
        this.status = SessionStatus.STARTING;
    }

    public Long getPortId() { return portId; }
    public Long getVehicleId() { return vehicleId; }
    public Long getSlotBookingId() { return slotBookingId; }
    public Long getScheduleItemId() { return scheduleItemId; }
    public SessionStatus getStatus() { return status; }
    public Instant getRequestedAt() { return requestedAt; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public double getEnergyKwh() { return energyKwh; }

    public void confirmPowerOn(Instant at) { this.status = SessionStatus.ACTIVE; this.startedAt = at; }
    public void fail() { this.status = SessionStatus.FAILED; }
    public void stopping() { this.status = SessionStatus.STOPPING; }
    public void addEnergy(double kwh) { this.energyKwh += kwh; }

    public void complete(Instant at, double energyKwh, Integer endBattery) {
        this.status = SessionStatus.COMPLETED;
        this.endedAt = at;
        this.energyKwh = Math.max(this.energyKwh, energyKwh);
        this.endBattery = endBattery == null ? null : endBattery.shortValue();
    }

    public boolean live() { return status == SessionStatus.STARTING || status == SessionStatus.ACTIVE || status == SessionStatus.STOPPING; }
}
