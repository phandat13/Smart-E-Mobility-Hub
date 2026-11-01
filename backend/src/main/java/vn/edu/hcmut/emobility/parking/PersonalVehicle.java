package vn.edu.hcmut.emobility.parking;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "personal_vehicle")
public class PersonalVehicle extends BaseEntity {

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "plate_number", nullable = false, unique = true, length = 20)
    private String plateNumber;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(name = "battery_kwh", nullable = false)
    private double batteryKwh;

    @Column(name = "connector_type", nullable = false, length = 20)
    private String connectorType;

    protected PersonalVehicle() {}

    public static PersonalVehicle register(Long ownerId, String plateNumber, String type,
                                           double batteryKwh, String connectorType) {
        PersonalVehicle v = new PersonalVehicle();
        v.ownerId = ownerId;
        v.plateNumber = plateNumber;
        v.type = type;
        v.batteryKwh = batteryKwh;
        v.connectorType = connectorType;
        return v;
    }

    public Long getOwnerId() { return ownerId; }
    public String getPlateNumber() { return plateNumber; }
    public String getType() { return type; }
    public double getBatteryKwh() { return batteryKwh; }
    public String getConnectorType() { return connectorType; }
}
