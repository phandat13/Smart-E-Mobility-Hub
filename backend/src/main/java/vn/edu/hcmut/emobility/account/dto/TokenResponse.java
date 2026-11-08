package vn.edu.hcmut.emobility.account.dto;

import java.time.Instant;

public record TokenResponse(String accessToken, String tokenType, Instant expiresAt, UserResponse user) {}
