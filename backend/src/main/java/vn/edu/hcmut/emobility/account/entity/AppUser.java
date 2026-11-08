package vn.edu.hcmut.emobility.account.entity;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;
import vn.edu.hcmut.emobility.core.Security.Role;

@Entity
@Table(name = "app_user")
public class AppUser extends BaseEntity {
    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    protected AppUser() {}

    public AppUser(String username, String passwordHash, Role role, String fullName) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.fullName = fullName;
        this.status = UserStatus.ACTIVE;
    }

    public boolean isActive() { return status == UserStatus.ACTIVE; }
    public void changePassword(String newHash) { this. passwordHash = newHash; }
    public void rename(String fullName) { this.fullName = fullName; }
    public void lock() { this.status = USerStatus.LOCKED; }

    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public String getFullName() { return fullName; }
    public UserStatus getStatus() { return status; }
}