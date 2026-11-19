package vn.edu.hcmut.emobility.account;

import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.account.AccountDtos.*;
import vn.edu.hcmut.emobility.core.audit.AuditService;
import vn.edu.hcmut.emobility.core.crypto.CryptoService;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.core.notification.NotificationService;

/** AC04: chỉnh sửa thông tin tài khoản sinh viên, đổi mật khẩu. */
@Service
public class ProfileService {

    private final AppUserRepository users;
    private final StudentProfileRepository profiles;
    private final CryptoService crypto;
    private final PasswordEncoder encoder;
    private final NotificationService notifications;
    private final AuditService audit;

    public ProfileService(AppUserRepository users, StudentProfileRepository profiles, CryptoService crypto,
                          PasswordEncoder encoder, NotificationService notifications, AuditService audit) {
        this.users = users;
        this.profiles = profiles;
        this.crypto = crypto;
        this.encoder = encoder;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public ProfileView get(Long userId) {
        AppUser u = user(userId);
        StudentProfile p = profile(userId);
        return view(u, p);
    }

    @Transactional
    public ProfileView update(Long userId, UpdateProfileRequest r) {
        AppUser u = user(userId);
        StudentProfile p = profile(userId);
        String newHash = crypto.hash(r.phone());
        if (!newHash.equals(p.getPhoneHash())) {
            if (profiles.existsByPhoneHash(newHash)) {
                throw new BusinessException(ErrorCode.PROFILE_DUPLICATED, "Số điện thoại đã được sử dụng", Map.of("phone", "Số điện thoại đã được sử dụng"));
            }
            p.setPhone(crypto.encrypt(r.phone()), newHash);
        }
        u.setFullName(r.fullName().trim());
        p.setAddress(r.address());
        audit.record(userId, "PROFILE_UPDATE", "USER", userId, null);
        notifications.notify(userId, "ACCOUNT", "Cập nhật hồ sơ thành công", "Thông tin cá nhân của bạn đã được cập nhật.");
        return view(u, p);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest r) {
        AppUser u = user(userId);
        if (!encoder.matches(r.currentPassword(), u.getPasswordHash())) {
            throw new BusinessException(ErrorCode.WRONG_PASSWORD, ErrorCode.WRONG_PASSWORD.getMessage(), Map.of("currentPassword", "Mật khẩu hiện tại không đúng"));
        }
        u.setPasswordHash(encoder.encode(r.newPassword()));
        audit.record(userId, "PASSWORD_CHANGE", "USER", userId, null);
        notifications.notify(userId, "ACCOUNT", "Đổi mật khẩu thành công", "Mật khẩu tài khoản của bạn vừa được thay đổi.");
    }

    private ProfileView view(AppUser u, StudentProfile p) {
        return new ProfileView(u.getId(), u.getUsername(), u.getFullName(), p.getStudentCode(), p.getEmail(),
                crypto.decrypt(p.getPhoneEncrypted()), p.getSchool(), p.getAddress(), p.isVerified());
    }

    private AppUser user(Long id) {
        return users.findById(id).orElseThrow(() -> BusinessException.notFound("Tài khoản", id));
    }

    private StudentProfile profile(Long userId) {
        return profiles.findByUserId(userId).orElseThrow(() -> BusinessException.notFound("Hồ sơ sinh viên", userId));
    }
}
