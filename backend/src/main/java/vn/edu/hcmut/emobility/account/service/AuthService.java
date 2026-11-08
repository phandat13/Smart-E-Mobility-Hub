package vn.edu.hcmut.emobility.account.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.account.dto.*;
import vn.edu.hcmut.emobility.account.entity.AppUser;
import vn.edu.hcmut.emobility.account.entity.StudentProfile;
import vn.edu.hcmut.emobility.account.repository.AppUserRepository;
import vn.edu.hcmut.emobility.account.repository.StudentProfileRepository;
import vn.edu.hcmut.emobility.core.event.UserNotification;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.security.AuthUser;
import vn.edu.hcmut.emobility.core.security.JwtService;
import vn.edu.hcmut.emobility.core.security.Role;

/** AC02 Đăng ký, AC03 Đăng nhập, AC04 Cập nhật thông tin cá nhân. */
@Service
public class AuthService {

    private static final Logger audit = LoggerFactory.getLogger("AUDIT");

    private final AppUserRepository userRepo;
    private final StudentProfileRepository profileRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final ApplicationEventPublisher events;

    public AuthService(AppUserRepository userRepo, StudentProfileRepository profileRepo,
                       PasswordEncoder encoder, JwtService jwtService, ApplicationEventPublisher events) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.events = events;
    }

    /** AC02 */
    @Transactional
    public UserResponse register(RegisterRequest req) {
        String username = req.username().trim().toLowerCase();
        String email = req.email().trim().toLowerCase();
        String citizenHash = sha256(req.citizenId());

        if (userRepo.existsByUsername(username)) throw new BusinessException(ErrorCode.USERNAME_TAKEN);
        if (profileRepo.existsByStudentCode(req.studentCode())) {
            throw new BusinessException(ErrorCode.CONFLICT, "MSSV đã được đăng ký", Map.of("field", "studentCode"));
        }
        if (profileRepo.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Email đã được sử dụng", Map.of("field", "email"));
        }
        if (profileRepo.existsByCitizenIdHash(citizenHash)) {
            throw new BusinessException(ErrorCode.CITIZEN_ID_INVALID, "Số CCCD đã được dùng cho tài khoản khác",
                    Map.of("field", "citizenId"));
        }

        AppUser user = userRepo.save(new AppUser(username, encoder.encode(req.password()), Role.STUDENT,
                req.fullName().trim()));
        StudentProfile profile = profileRepo.save(new StudentProfile(user.getId(), req.studentCode(),
                req.phone(), email, citizenHash, req.citizenId().substring(8)));

        events.publishEvent(new UserNotification(user.getId(), "ACCOUNT_CREATED", "Tạo tài khoản thành công",
                "Chào mừng " + user.getFullName() + " đến với Smart E-Mobility Hub", Map.of()));
        audit.info("REGISTER userId={} username={}", user.getId(), username);
        return UserResponse.of(user, profile);
    }

    /** AC03 */
    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest req) {
        AppUser user = userRepo.findByUsername(req.username().trim().toLowerCase())
                .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> {
                    audit.warn("LOGIN_FAILED username={}", req.username());
                    return new BusinessException(ErrorCode.INVALID_CREDENTIALS);
                });
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Tài khoản đã bị khóa");
        }
        JwtService.IssuedToken token = jwtService.issue(new AuthUser(user.getId(), user.getUsername(), user.getRole()));
        audit.info("LOGIN userId={} role={}", user.getId(), user.getRole());
        StudentProfile profile = profileRepo.findByUserId(user.getId()).orElse(null);
        return new TokenResponse(token.accessToken(), "Bearer", token.expiresAt(), UserResponse.of(user, profile));
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        AppUser user = userRepo.findById(userId).orElseThrow(() -> BusinessException.notFound("Tài khoản", userId));
        return UserResponse.of(user, profileRepo.findByUserId(userId).orElse(null));
    }

    /** AC04 */
    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest req) {
        AppUser user = userRepo.findById(userId).orElseThrow(() -> BusinessException.notFound("Tài khoản", userId));

        if (req.newPassword() != null) {
            if (req.currentPassword() == null || !encoder.matches(req.currentPassword(), user.getPasswordHash())) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Mật khẩu hiện tại không đúng",
                        Map.of("currentPassword", "Mật khẩu hiện tại không đúng"));
            }
            user.changePassword(encoder.encode(req.newPassword()));
        }
        if (req.fullName() != null) user.rename(req.fullName().trim());

        StudentProfile profile = profileRepo.findByUserId(userId).orElse(null);
        if (profile != null) profile.updateContact(req.phone(), req.address(), req.nickname());

        events.publishEvent(new UserNotification(userId, "PROFILE_UPDATED", "Cập nhật thông tin thành công",
                "Thông tin cá nhân của bạn đã được cập nhật", Map.of()));
        return UserResponse.of(user, profile);
    }

    static String sha256(String value) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
