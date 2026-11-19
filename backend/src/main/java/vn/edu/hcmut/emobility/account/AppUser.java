package vn.edu.hcmut.emobility.account;

import jakarta.persistence.*;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;
import vn.edu.hcmut.emobility.core.common.VersionedEntity;
import vn.edu.hcmut.emobility.core.security.Role;

@Entity
@Table(name = "app_user")
public class AppUser extends VersionedEntity {
    @Column(nullable = false, unique = true) private String username;
    @Column(name = "password_hash", nullable = false) private String passwordHash;
    @Column(name = "full_name", nullable = false) private String fullName;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private UserStatus status;

    /** Góp ý #2: tập vai trò được cấp cho tài khoản – nguồn sự thật duy nhất cho phân quyền. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_role", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Set<Role> roles = new HashSet<>();

    protected AppUser() {}

    public AppUser(String username, String passwordHash, String fullName, UserStatus status, Set<Role> roles) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.status = status;
        this.roles = new HashSet<>(roles);
    }

    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getFullName() { return fullName; }
    public UserStatus getStatus() { return status; }
    public Set<Role> getRoles() { return roles.isEmpty() ? Set.of() : EnumSet.copyOf(roles); }

    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setStatus(UserStatus status) { this.status = status; }
    public boolean hasRole(Role r) { return roles.contains(r); }
}
