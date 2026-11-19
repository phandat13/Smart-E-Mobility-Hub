package vn.edu.hcmut.emobility.account;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.account.AccountDtos.*;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.config.AppProperties;
import vn.edu.hcmut.emobility.core.crypto.CryptoService;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.notification.NotificationService;
import vn.edu.hcmut.emobility.core.security.AuthUser;
import vn.edu.hcmut.emobility.core.security.JwtService;
import vn.edu.hcmut.emobility.core.security.Role;

/** AC02 đăng ký, AC03 đăng nhập (cổng sinh viên + cổng nội bộ), chọn ngữ cảnh vai trò. */
@Service
public class AuthService {

    /** Thứ tự ưu tiên vai trò mặc định khi tài khoản nội bộ có nhiều vai trò. */
    private static final List<Role> INTERNAL_PRIORITY = List.of(Role.OPERATOR, Role.TECHNICIAN, Role.DRIVER);

    private final AppUserRepository users;
    private final StudentProfileRepository profiles;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final CryptoService crypto;
    private final AuditService audit;
    private final NotificationService notifications;
    private final AppProperties props;

    public AuthService(AppUserRepository users, StudentProfileRepository profiles, PasswordEncoder encoder, JwtService jwt,
                       CryptoService crypto, AuditService audit, NotificationService notifications, AppProperties props) {
        this.users = users;
        this.profiles = profiles;
        this.encoder = encoder;
        this.jwt = jwt;
        this.crypto = crypto;
        this.audit = audit;
        this.notifications = notifications;
        this.props = props;
    }

    @Transactional
    public RegisterResult register(RegisterRequest r) {
        String cccd = r.citizenId().trim();
        if (!CitizenIdValidator.isValid(cccd)) {
            throw new BusinessException(ErrorCode.CITIZEN_ID_INVALID, "Số CCCD không hợp lệ: cần 12 chữ số, mã tỉnh và mã thế kỷ/giới tính hợp lệ",
                    Map.of("citizenId", "Số CCCD không chuẩn"));
        }
        if (users.existsByUsername(r.username())) throw new BusinessException(ErrorCode.USERNAME_TAKEN);
        String phoneHash = crypto.hash(r.phone());
        String cccdHash = crypto.hash(cccd);
        if (profiles.existsByStudentCode(r.studentCode()) || profiles.existsByEmail(r.email().toLowerCase())
                || profiles.existsByPhoneHash(phoneHash) || profiles.existsByCitizenIdHash(cccdHash)) {
            throw new BusinessException(ErrorCode.PROFILE_DUPLICATED);
        }
        boolean auto = props.account().autoVerify();
        AppUser u = users.save(new AppUser(r.username(), encoder.encode(r.password()), r.fullName().trim(),
                auto ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION, EnumSet.of(Role.STUDENT)));
        profiles.save(new StudentProfile(u.getId(), r.studentCode(), r.email().toLowerCase(),
                r.school() == null || r.school().isBlank() ? "ĐH Bách khoa – ĐHQG-HCM" : r.school(),
                crypto.encrypt(r.phone()), phoneHash, crypto.encrypt(cccd), cccdHash, auto));
        audit.record(u.getId(), "REGISTER", "USER", u.getId(), Map.of("studentCode", r.studentCode()));
        notifications.notify(u.getId(), "ACCOUNT", "Hồ sơ đã được tiếp nhận",
                auto ? "Tài khoản đã được xác thực, bạn có thể đăng nhập." : "Kết quả xác thực sẽ được gửi trong vòng 24 giờ.");
        return new RegisterResult("#DK-" + r.studentCode(), u.getFullName(), r.email().toLowerCase(), CryptoService.mask(r.phone()),
                u.getStatus(), auto ? "Tài khoản đã được xác thực" : "Đang chờ xác thực");
    }

    @Transactional
    public TokenResponse login(LoginRequest r) {
        AppUser u = users.findByUsername(r.username())
                .filter(x -> encoder.matches(r.password(), x.getPasswordHash()))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
        if (u.getStatus() != UserStatus.ACTIVE) throw new BusinessException(ErrorCode.ACCOUNT_NOT_ACTIVE);

        Role active;
        boolean chooseContext = false;
        if (r.portal() == Portal.STUDENT) {
            if (!u.hasRole(Role.STUDENT)) throw new BusinessException(ErrorCode.PORTAL_MISMATCH, "Tài khoản nội bộ vui lòng đăng nhập tại Cổng nội bộ");
            active = Role.STUDENT;
        } else {
            List<Role> internal = u.getRoles().stream().filter(INTERNAL_PRIORITY::contains)
                    .sorted(Comparator.comparingInt(INTERNAL_PRIORITY::indexOf)).toList();
            if (internal.isEmpty()) throw new BusinessException(ErrorCode.PORTAL_MISMATCH, "Tài khoản sinh viên vui lòng đăng nhập tại Cổng sinh viên");
            // Vai trò xác định từ TÀI KHOẢN; nếu có nhiều vai trò → giao diện cho chọn ngữ cảnh trong các vai trò đã cấp
            active = internal.get(0);
            chooseContext = internal.size() > 1;
        }
        audit.record(u.getId(), "LOGIN", "USER", u.getId(), Map.of("portal", r.portal().name(), "role", active.name()));
        return issue(u, active, chooseContext);
    }

    /** Đổi ngữ cảnh làm việc: hệ thống kiểm tra quyền ĐÃ ĐƯỢC CẤP (đọc từ DB, không tin token). */
    @Transactional
    public TokenResponse switchContext(Role role) {
        AuthUser current = vn.edu.hcmut.emobility.core.security.CurrentUser.require();
        AppUser u = users.findById(current.id()).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (!u.hasRole(role)) {
            audit.record(u.getId(), "CONTEXT_DENIED", "USER", u.getId(), Map.of("role", role.name()));
            throw new BusinessException(ErrorCode.ROLE_NOT_GRANTED);
        }
        if ((role == Role.STUDENT) != (current.role() == Role.STUDENT)) throw new BusinessException(ErrorCode.PORTAL_MISMATCH);
        audit.record(u.getId(), "CONTEXT_SWITCH", "USER", u.getId(), Map.of("role", role.name()));
        return issue(u, role, false);
    }

    @Transactional(readOnly = true)
    public UserView me() {
        AuthUser current = vn.edu.hcmut.emobility.core.security.CurrentUser.require();
        AppUser u = users.findById(current.id()).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        return view(u, current.role());
    }

    private TokenResponse issue(AppUser u, Role active, boolean chooseContext) {
        Set<Role> roles = u.getRoles();
        JwtService.IssuedToken t = jwt.issue(new AuthUser(u.getId(), u.getUsername(), active, roles));
        return new TokenResponse(t.accessToken(), t.expiresAt(), view(u, active), chooseContext);
    }

    private UserView view(AppUser u, Role active) {
        String code = profiles.findByUserId(u.getId()).map(StudentProfile::getStudentCode).orElse(null);
        return new UserView(u.getId(), u.getUsername(), u.getFullName(), active, u.getRoles(), code);
    }
}
