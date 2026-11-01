package vn.edu.hcmut.emobility.rebalancing;

import jakarta.validation.constraints.NotNull;

public record LoadVehicleRequest(@NotNull Long vehicleId) {}
