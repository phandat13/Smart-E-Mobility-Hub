package vn.edu.hcmut.emobility.core.security;

import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;

public final class CurrentUser {

    private CurrentUser() {}

    public static Optional<AuthUser> find() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser u) return Optional.of(u);
        return Optional.empty();
    }

    public static AuthUser require() {
        return find().orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }
}
