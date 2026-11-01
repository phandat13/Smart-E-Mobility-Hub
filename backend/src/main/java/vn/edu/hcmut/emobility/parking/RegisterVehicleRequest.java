package vn.edu.hcmut.emobility.parking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record RegisterVehicleRequest(@NotBlank @Size(max = 20) String plateNumber,
                                     @NotBlank @Size(max = 20) String type,
                                     @Positive double batteryKwh,
                                     @NotBlank @Size(max = 20) String connectorType) {}
