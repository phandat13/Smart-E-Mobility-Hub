package vn.edu.hcmut.emobility.account;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.common.BaseEntity;

@Entity
@Table(name = "student_profile")
public class StudentProfile extends BaseEntity {
    @Column(name = "user_id", nullable = false, unique = true) private Long userId;
    @Column(name = "student_code", nullable = false, unique = true) private String studentCode;
    @Column(nullable = false, unique = true) private String email;
    private String school;
    private String address;
    @Column(name = "phone_encrypted", nullable = false) private String phoneEncrypted;
    @Column(name = "phone_hash", nullable = false, unique = true) private String phoneHash;
    @Column(name = "citizen_id_encrypted", nullable = false) private String citizenIdEncrypted;
    @Column(name = "citizen_id_hash", nullable = false, unique = true) private String citizenIdHash;
    @Column(nullable = false) private boolean verified;

    protected StudentProfile() {}

    public StudentProfile(Long userId, String studentCode, String email, String school,
                          String phoneEncrypted, String phoneHash, String citizenIdEncrypted, String citizenIdHash, boolean verified) {
        this.userId = userId;
        this.studentCode = studentCode;
        this.email = email;
        this.school = school;
        this.phoneEncrypted = phoneEncrypted;
        this.phoneHash = phoneHash;
        this.citizenIdEncrypted = citizenIdEncrypted;
        this.citizenIdHash = citizenIdHash;
        this.verified = verified;
    }

    public Long getUserId() { return userId; }
    public String getStudentCode() { return studentCode; }
    public String getEmail() { return email; }
    public String getSchool() { return school; }
    public String getAddress() { return address; }
    public String getPhoneEncrypted() { return phoneEncrypted; }
    public String getPhoneHash() { return phoneHash; }
    public String getCitizenIdEncrypted() { return citizenIdEncrypted; }
    public boolean isVerified() { return verified; }

    public void setAddress(String address) { this.address = address; }
    public void setPhone(String encrypted, String hash) { this.phoneEncrypted = encrypted; this.phoneHash = hash; }
    public void setVerified(boolean verified) { this.verified = verified; }
}
