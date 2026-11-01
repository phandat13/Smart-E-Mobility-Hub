package vn.edu.hcmut.emobility.parking;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record CreateBookingRequest(@NotNull Long personalVehicleId,
                                   @NotNull Long hubId,
                                   @NotNull ServiceType serviceType,
                                   @NotNull Instant startAt,
                                   @NotNull Instant endAt) {}
