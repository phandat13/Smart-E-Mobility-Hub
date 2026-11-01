package vn.edu.hcmut.emobility.parking;

import jakarta.validation.constraints.NotBlank;

public record CheckInRequest(@NotBlank String qrToken) {}
