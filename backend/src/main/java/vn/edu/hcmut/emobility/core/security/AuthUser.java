package vn.edu.hcmut.emobility.core.security;

import java.security.Principal;
import java.util.Set;

/**
 * Người dùng đã xác thực.
 * {@code role} là vai trò đang làm việc (ngữ cảnh); {@code roles} là toàn bộ vai trò ĐÃ ĐƯỢC CẤP cho tài khoản.
 * Góp ý #2: vai trò không do người dùng tự chọn; chỉ được chọn ngữ cảnh trong tập roles đã cấp.
 */
public record AuthUser(Long id, String username, Role role, Set<Role> roles) implements Principal {

    public AuthUser {
        roles = roles == null || roles.isEmpty() ? Set.of(role) : Set.copyOf(roles);
        if (!roles.contains(role)) throw new IllegalArgumentException("Vai trò hoạt động không thuộc tài khoản");
    }

    @Override
    public String getName() { return String.valueOf(id); }

    public boolean is(Role r) { return role == r; }
}
