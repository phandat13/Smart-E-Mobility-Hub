package vn.edu.hcmut.emobility.account.dto;

import jakarta.validation.constraints.*;

public record UpdateProfileRequest(
        @Size(min = 1, max = 100) String fullName,
        @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0") String phone,
        @Size(max = 255) String address,
        @Size(max = 50) String nickname,
        String currentPassword,
        @Size(min = 8, max = 72) @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Mật khẩu phải có cả chữ và số")
        String newPassword) {}
