package vn.edu.hcmut.emobility.account;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.Set;
import vn.edu.hcmut.emobility.core.security.Role;

public final class AccountDtos {
    private AccountDtos() {}

    public enum Portal { STUDENT, INTERNAL }

    /** AC02 – E1: ký tự không hợp lệ được chỉ rõ vị trí lỗi qua thông báo validation theo từng trường. */
    public record RegisterRequest(
            @NotBlank @Size(max = 100) @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Họ tên chỉ gồm chữ cái và khoảng trắng") String fullName,
            @NotBlank @Pattern(regexp = "^\\d{7,10}$", message = "Mã số sinh viên gồm 7–10 chữ số") String studentCode,
            @NotBlank @Email(message = "Email không hợp lệ") String email,
            @NotBlank @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0") String phone,
            @NotBlank String citizenId,
            @Size(max = 100) String school,
            @NotBlank @Pattern(regexp = "^[a-zA-Z0-9._]{4,50}$", message = "Tên đăng nhập 4–50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới") String username,
            @NotBlank @Size(min = 6, max = 64, message = "Mật khẩu 6–64 ký tự") String password,
            @AssertTrue(message = "Bạn cần đồng ý cam kết sử dụng hệ thống") boolean acceptTerms) {}

    public record RegisterResult(String profileCode, String fullName, String email, String maskedPhone, UserStatus status, String message) {}

    public record LoginRequest(
            @NotBlank @Pattern(regexp = "^[a-zA-Z0-9._]{3,50}$", message = "Tên đăng nhập chứa ký tự không hợp lệ") String username,
            @NotBlank String password,
            @NotNull Portal portal) {}

    public record ContextRequest(@NotNull Role role) {}

    public record TokenResponse(String accessToken, Instant expiresAt, UserView user, boolean requiresContextSelection) {}

    public record UserView(Long id, String username, String fullName, Role activeRole, Set<Role> roles, String studentCode) {}

    public record ProfileView(Long userId, String username, String fullName, String studentCode, String email,
                              String phone, String school, String address, boolean verified) {}

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 100) @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Họ tên chỉ gồm chữ cái và khoảng trắng") String fullName,
            @NotBlank @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0") String phone,
            @Size(max = 255) String address) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 6, max = 64, message = "Mật khẩu 6–64 ký tự") String newPassword) {}
}
