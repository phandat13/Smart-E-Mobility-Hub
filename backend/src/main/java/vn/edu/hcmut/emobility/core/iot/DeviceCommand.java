package vn.edu.hcmut.emobility.core.iot;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "device_command")
public class DeviceCommand extends BaseEntity {
    @Enumerated(EnumType.STRING) @Column(name = "device_type", nullable = false) private DeviceType deviceType;
    @Column(name = "device_id", nullable = false) private Long deviceId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private CommandType command;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private CommandStatus status;
    @Column(name = "context_type") private String contextType;
    @Column(name = "context_id") private Long contextId;
    @Column(name = "requested_at", nullable = false) private Instant requestedAt;
    @Column(name = "responded_at") private Instant respondedAt;
    @Column(nullable = false) private int attempts;
    private String detail;

    protected DeviceCommand() {}

    public DeviceCommand(DeviceType deviceType, Long deviceId, CommandType command, String contextType, Long contextId, Instant now) {
        this.deviceType = deviceType;
        this.deviceId = deviceId;
        this.command = command;
        this.contextType = contextType;
        this.contextId = contextId;
        this.requestedAt = now;
        this.status = CommandStatus.SENT;
    }

    public DeviceType getDeviceType() { return deviceType; }
    public Long getDeviceId() { return deviceId; }
    public CommandType getCommand() { return command; }
    public CommandStatus getStatus() { return status; }
    public String getContextType() { return contextType; }
    public Long getContextId() { return contextId; }
    public Instant getRequestedAt() { return requestedAt; }
    public Instant getRespondedAt() { return respondedAt; }
    public int getAttempts() { return attempts; }
    public String getDetail() { return detail; }

    public void complete(CommandStatus status, Instant at, String detail) {
        this.status = status;
        this.respondedAt = at;
        this.detail = detail;
    }

    public void incrementAttempts() { attempts++; }
}
