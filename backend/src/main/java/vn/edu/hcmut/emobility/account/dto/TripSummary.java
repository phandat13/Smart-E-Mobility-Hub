package vn.edu.hcmut.emobility.account.dto;

import java.math.BigDecimal;
import java.time.Instant;
import vn.edu.hcmut.emobility.rental.entity.Trip;

public record TripSummary(Long id, Long vehicleId, Long startHubId, Long endHubId, Instant startedAt,
                          Instant endedAt, Double distanceKm, BigDecimal cost, boolean rated) {
    public static TripSummary of(Trip t) {
        return new TripSummary(t.getId(), t.getVehicleId(), t.getStartHubId(), t.getEndHubId(),
                t.getStartedAt(), t.getEndedAt(), t.getDistanceKm(), t.getCost(), t.isRated());
    }
}
