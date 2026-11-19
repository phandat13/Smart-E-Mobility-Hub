package vn.edu.hcmut.emobility.hub;

import jakarta.persistence.*;
import java.time.Instant;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "charging_port")
public class ChargingPort extends VersionedEntity {
    @Column(name = "hub_id", nullable = false) private Long hubId;
    @Column(nullable = false) private String code;
    @Column(name = "power_kw", nullable = false) private double powerKw;
    @Column(name = "connector_type", nullable = false) private String connectorType;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private PortStatus status;
    @Column(name = "disable_after_session", nullable = false) private boolean disableAfterSession;
    @Column(name = "error_code") private String errorCode;
    @Column(name = "last_seen_at") private Instant lastSeenAt;

    protected ChargingPort() {}

    public ChargingPort(Long hubId, String code, double powerKw, String connectorType) {
        this.hubId = hubId;
        this.code = code;
        this.powerKw = powerKw;
        this.connectorType = connectorType;
        this.status = PortStatus.PENDING_CHECK;
    }

    public Long getHubId() { return hubId; }
    public String getCode() { return code; }
    public double getPowerKw() { return powerKw; }
    public String getConnectorType() { return connectorType; }
    public PortStatus getStatus() { return status; }
    public boolean isDisableAfterSession() { return disableAfterSession; }
    public String getErrorCode() { return errorCode; }
    public Instant getLastSeenAt() { return lastSeenAt; }

    public void setStatus(PortStatus status) { this.status = status; }
    public void setSpec(String code, double powerKw, String connectorType) { this.code = code; this.powerKw = powerKw; this.connectorType = connectorType; }
    public void setDisableAfterSession(boolean v) { this.disableAfterSession = v; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
    public void seen(Instant at) { this.lastSeenAt = at; }
}
