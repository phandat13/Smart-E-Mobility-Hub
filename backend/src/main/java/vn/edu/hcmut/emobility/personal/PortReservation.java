package vn.edu.hcmut.emobility.personal;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

/** Cam kết sử dụng một cổng sạc trong khung giờ – chung cho đặt chỗ sinh viên và lịch sạc đội xe. */
@Entity
@Table(name = "port_reservation")
public class PortReservation extends VersionedEntity {
    @Column(name = "port_id", nullable = false) private Long portId;
    @Column(name = "start_at", nullable = false) private Instant startAt;
    @Column(name = "end_at", nullable = false) private Instant endAt;
    @Enumerated(EnumType.STRING) @Column(name = "source_type", nullable = false) private PortReservationSource sourceType;
    @Column(name = "source_id", nullable = false) private Long sourceId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private PortReservationStatus status;

    protected PortReservation() {}

    public PortReservation(Long portId, Instant startAt, Instant endAt, PortReservationSource sourceType, Long sourceId) {
        this.portId = portId;
        this.startAt = startAt;
        this.endAt = endAt;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.status = PortReservationStatus.ACTIVE;
    }

    public Long getPortId() { return portId; }
    public Instant getStartAt() { return startAt; }
    public Instant getEndAt() { return endAt; }
    public PortReservationSource getSourceType() { return sourceType; }
    public Long getSourceId() { return sourceId; }
    public PortReservationStatus getStatus() { return status; }

    public void setStatus(PortReservationStatus status) { this.status = status; }
    public void move(Long portId, Instant startAt, Instant endAt) { this.portId = portId; this.startAt = startAt; this.endAt = endAt; }
}
