package vn.edu.hcmut.emobility.account;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmut.emobility.account.AccountDtos.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** AC02 */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResult register(@Valid @RequestBody RegisterRequest r) {
        return auth.register(r);
    }

    /** AC03 – không có tham số vai trò: vai trò lấy từ tài khoản (góp ý #2). */
    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest r) {
        return auth.login(r);
    }

    /** Chọn ngữ cảnh làm việc cho tài khoản có nhiều vai trò đã được cấp. */
    @PostMapping("/context")
    public TokenResponse context(@Valid @RequestBody ContextRequest r) {
        return auth.switchContext(r.role());
    }

    @GetMapping("/me")
    public UserView me() {
        return auth.me();
    }
}
