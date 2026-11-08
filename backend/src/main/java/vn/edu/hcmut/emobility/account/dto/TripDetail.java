package vn.edu.hcmut.emobility.account.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record TripDetail(Long id, Long vehicleId, String vehicleCode, Long startHubId, String startHubName,
                         Long endHubId, String endHubName, Instant startedAt, Instant endedAt,
                         long durationMinutes, Double distanceKm, Integer startBattery, Integer endBattery,
                         BigDecimal cost, RatingResponse rating) {}
