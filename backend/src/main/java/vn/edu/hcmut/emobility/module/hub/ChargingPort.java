package vn.edu.hcmut.emobility.module.hub;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;

@Entity
@Table(name = "charging_port")
public class ChargingPort extends VersionedEntity {

    @Column(name = "hub_id", nullable = false)
    private Long hubId;

    @Column(nullable = false, length = 20)
    private String code;

    @Column(name = "power_kw", nullable = false)
    private double powerKw;

    @Column(name = "connector_type", nullable = false, length = 20)
    private String connectorType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResourceStatus status;

    @Column(name = "current_session_id")
    private Long currentSessionId;

    protected ChargingPort() {}

    public Long getHubId() { return hubId; }
    public String getCode() { return code; }
    public double getPowerKw() { return powerKw; }
    public String getConnectorType() { return connectorType; }
    public ResourceStatus getStatus() { return status; }
    public Long getCurrentSessionId() { return currentSessionId; }

    public void changeStatus(ResourceStatus status) { this.status = status; }
}
