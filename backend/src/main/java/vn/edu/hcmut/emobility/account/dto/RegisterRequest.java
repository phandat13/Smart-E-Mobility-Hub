package vn.edu.hcmut.emobility.account.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Pattern(regexp = "^[a-zA-Z0-9._]{4,50}$", message = "4–50 ký tự: chữ, số, dấu chấm, gạch dưới")
        String username,
        @NotBlank @Size(min = 8, max = 72, message = "Mật khẩu 8–72 ký tự")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Mật khẩu phải có cả chữ và số")
        String password,
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Pattern(regexp = "^[0-9A-Za-z]{6,20}$", message = "MSSV không hợp lệ") String studentCode,
        @NotBlank @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0") String phone,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Pattern(regexp = "^\\d{12}$", message = "CCCD gồm đúng 12 chữ số") String citizenId) {}
