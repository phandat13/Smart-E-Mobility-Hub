package vn.edu.hcmut.emobility.iot;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.ColumnTransformer;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "telemetry_record")
public class TelemetryRecord extends BaseEntity {
    @Column(name = "device_type", nullable = false) private String deviceType;
    @Column(name = "device_id", nullable = false) private Long deviceId;
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String payload;
    @Column(name = "received_at", nullable = false) private Instant receivedAt;

    protected TelemetryRecord() {}

    public TelemetryRecord(String deviceType, Long deviceId, String payload, Instant receivedAt) {
        this.deviceType = deviceType;
        this.deviceId = deviceId;
        this.payload = payload;
        this.receivedAt = receivedAt;
    }

    public String getDeviceType() { return deviceType; }
    public Long getDeviceId() { return deviceId; }
    public String getPayload() { return payload; }
    public Instant getReceivedAt() { return receivedAt; }
}
