package vn.edu.hcmut.emobility.rental;

import jakarta.validation.constraints.NotNull;

public record ReserveRequest(@NotNull Long vehicleId) {}
