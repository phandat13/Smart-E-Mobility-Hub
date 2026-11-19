package vn.edu.hcmut.emobility.personal;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "personal_vehicle")
public class PersonalVehicle extends BaseEntity {
    @Column(name = "owner_id", nullable = false) private Long ownerId;
    @Column(name = "plate_number", nullable = false) private String plateNumber;
    @Column(nullable = false) private String type;
    private String model;
    @Column(name = "battery_kwh", nullable = false) private double batteryKwh;
    @Column(name = "connector_type", nullable = false) private String connectorType;
    @Column(nullable = false) private boolean active;

    protected PersonalVehicle() {}

    public PersonalVehicle(Long ownerId, String plateNumber, String type, String model, double batteryKwh, String connectorType) {
        this.ownerId = ownerId;
        this.active = true;
        update(plateNumber, type, model, batteryKwh, connectorType);
    }

    public Long getOwnerId() { return ownerId; }
    public String getPlateNumber() { return plateNumber; }
    public String getType() { return type; }
    public String getModel() { return model; }
    public double getBatteryKwh() { return batteryKwh; }
    public String getConnectorType() { return connectorType; }
    public boolean isActive() { return active; }

    public void update(String plateNumber, String type, String model, double batteryKwh, String connectorType) {
        this.plateNumber = plateNumber.toUpperCase().trim();
        this.type = type;
        this.model = model;
        this.batteryKwh = batteryKwh;
        this.connectorType = connectorType;
    }

    /** Xóa mềm: giữ lịch sử đặt chỗ cũ tham chiếu tới xe. */
    public void deactivate() { this.active = false; }
}
