package vn.edu.hcmut.emobility.account.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record RatingRequest(
        @NotNull @Min(1) @Max(5) Integer vehicleStars,
        @NotNull @Min(1) @Max(5) Integer hubStars,
        @Size(max = 1000) String comment,
        @Size(max = 5) List<@Size(max = 500) String> photoUrls,
        boolean reportIncident,
        @Size(max = 50) String incidentCategory,
        boolean safetyIssue) {}
