package vn.edu.hcmut.emobility.rental;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "trip")
public class Trip extends VersionedEntity {
    @Column(nullable = false, unique = true) private String code;
    @Column(name = "reservation_id") private Long reservationId;
    @Column(name = "student_id", nullable = false) private Long studentId;
    @Column(name = "vehicle_id", nullable = false) private Long vehicleId;
    @Column(name = "start_hub_id", nullable = false) private Long startHubId;
    @Column(name = "end_hub_id") private Long endHubId;
    @Column(name = "end_slot_id") private Long endSlotId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private TripStatus status;
    @Enumerated(EnumType.STRING) @Column(name = "return_mode") private ReturnMode returnMode;
    @Column(name = "started_at", nullable = false) private Instant startedAt;
    @Column(name = "ended_at") private Instant endedAt;
    @Column(name = "client_ended_at") private Instant clientEndedAt;
    @Column(name = "start_battery", nullable = false) private short startBattery;
    @Column(name = "end_battery") private Short endBattery;
    @Column(name = "distance_km", nullable = false) private double distanceKm;
    private BigDecimal cost;
    @Column(name = "offline_secret", nullable = false) private String offlineSecret;
    @Column(name = "reconciliation_note") private String reconciliationNote;
    @Column(nullable = false) private boolean rated;

    protected Trip() {}

    public Trip(String code, Long reservationId, Long studentId, Long vehicleId, Long startHubId, Instant startedAt,
                int startBattery, String offlineSecret) {
        this.code = code;
        this.reservationId = reservationId;
        this.studentId = studentId;
        this.vehicleId = vehicleId;
        this.startHubId = startHubId;
        this.startedAt = startedAt;
        this.startBattery = (short) startBattery;
        this.offlineSecret = offlineSecret;
        this.status = TripStatus.IN_PROGRESS;
    }

    public String getCode() { return code; }
    public Long getReservationId() { return reservationId; }
    public Long getStudentId() { return studentId; }
    public Long getVehicleId() { return vehicleId; }
    public Long getStartHubId() { return startHubId; }
    public Long getEndHubId() { return endHubId; }
    public Long getEndSlotId() { return endSlotId; }
    public TripStatus getStatus() { return status; }
    public ReturnMode getReturnMode() { return returnMode; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public Instant getClientEndedAt() { return clientEndedAt; }
    public int getStartBattery() { return startBattery; }
    public Integer getEndBattery() { return endBattery == null ? null : endBattery.intValue(); }
    public double getDistanceKm() { return distanceKm; }
    public BigDecimal getCost() { return cost; }
    public String getOfflineSecret() { return offlineSecret; }
    public String getReconciliationNote() { return reconciliationNote; }
    public boolean isRated() { return rated; }

    public void setStatus(TripStatus status) { this.status = status; }
    public void addDistance(double km) { this.distanceKm += km; }
    public void markRated() { this.rated = true; }

    public void requestReturn(Long hubId, Long slotId, ReturnMode mode) {
        this.endHubId = hubId;
        this.endSlotId = slotId;
        this.returnMode = mode;
        this.status = TripStatus.RETURNING;
    }

    public void pendingReconciliation(ReturnMode mode, Instant clientEndedAt, String note) {
        this.returnMode = mode;
        this.clientEndedAt = clientEndedAt;
        this.reconciliationNote = note;
        this.status = TripStatus.PENDING_RECONCILIATION;
    }

    public void complete(Instant endedAt, Long hubId, Long slotId, int endBattery, BigDecimal cost) {
        this.endedAt = endedAt;
        this.endHubId = hubId;
        this.endSlotId = slotId;
        this.endBattery = (short) endBattery;
        this.cost = cost;
        this.status = TripStatus.COMPLETED;
    }
}
