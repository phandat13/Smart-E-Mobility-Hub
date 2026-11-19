package vn.edu.hcmut.emobility.charging;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

/** Góp ý #11: một mục LỊCH (kế hoạch), không phải phiên sạc đang chạy. */
@Entity
@Table(name = "charging_schedule_item")
public class ChargingScheduleItem extends VersionedEntity {
    @Column(name = "schedule_id", nullable = false) private Long scheduleId;
    @Column(name = "vehicle_id", nullable = false) private Long vehicleId;
    @Column(name = "port_id", nullable = false) private Long portId;
    @Column(name = "start_at", nullable = false) private Instant startAt;
    @Column(name = "end_at", nullable = false) private Instant endAt;
    @Column(nullable = false) private double priority;
    @Column(name = "target_battery", nullable = false) private short targetBattery;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ScheduleItemStatus status;
    @Column(name = "session_id") private Long sessionId;

    protected ChargingScheduleItem() {}

    public ChargingScheduleItem(Long scheduleId, Long vehicleId, Long portId, Instant startAt, Instant endAt, double priority, int targetBattery) {
        this.scheduleId = scheduleId;
        this.vehicleId = vehicleId;
        this.portId = portId;
        this.startAt = startAt;
        this.endAt = endAt;
        this.priority = priority;
        this.targetBattery = (short) targetBattery;
        this.status = ScheduleItemStatus.SCHEDULED;
    }

    public Long getScheduleId() { return scheduleId; }
    public Long getVehicleId() { return vehicleId; }
    public Long getPortId() { return portId; }
    public Instant getStartAt() { return startAt; }
    public Instant getEndAt() { return endAt; }
    public double getPriority() { return priority; }
    public int getTargetBattery() { return targetBattery; }
    public ScheduleItemStatus getStatus() { return status; }
    public Long getSessionId() { return sessionId; }

    public void setStatus(ScheduleItemStatus status) { this.status = status; }
    public void setPriority(double priority) { this.priority = priority; }
    public void move(Long portId, Instant startAt, Instant endAt) { this.portId = portId; this.startAt = startAt; this.endAt = endAt; }
    public void attachSession(Long sessionId) { this.sessionId = sessionId; this.status = ScheduleItemStatus.ACTIVE; }
}
