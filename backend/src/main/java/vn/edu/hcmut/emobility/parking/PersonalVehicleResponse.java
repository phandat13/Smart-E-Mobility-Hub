package vn.edu.hcmut.emobility.parking;

public record PersonalVehicleResponse(Long id, String plateNumber, String type, double batteryKwh,
                                      String connectorType) {

    public static PersonalVehicleResponse from(PersonalVehicle v) {
        return new PersonalVehicleResponse(v.getId(), v.getPlateNumber(), v.getType(), v.getBatteryKwh(),
                v.getConnectorType());
    }
}
