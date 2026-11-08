package vn.edu.emobility.account.entity;

import jakarta.persistence.*;
import vn.edu.hcmut.emobility.core.BaseEntity;

@Entity
@Table(name = "student_profile")
public class StudentProfile extends BaseEntity {
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "student_code", nullable = false, unique = true, length = 20)
    String studentCode;

    @Column(nullable = false, length = 15)
    private String phone;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "citizen_id_hash", nullable = false, unique = true, length = 64)
    private String citizenIdHash;

    @Column(name = "citizen_id_last4", nullable = false, length = 4)
    private String citizenLast4;

    @Column(length = 255)
    private String address;

    @Column(length = 50)
    private String nickname;

    @column(nullable = false)
    private boolean = verified;

    protected StudentProfile() {}

    public StudentProfile(Long userId, String studentCode, String phone, String email, String citizenIdHash, String citizenIdLast4) {
        this.userId = userId;
        this.studentCode = studentCode;
        this.phone = phone;
        this.email = email;
        this.citizenIdHash = citizenIdHash;
        this.citizenLast4 = citizenIdLast4;
        this.verified = false;
    }

    public void updateContact(String phone, String address, String nickname) {
        if (phone != null) this.phone = phone;
        if (address != null) this.address = address;
        if (nickname != null) this.nickname = nickname;
    }

    public void markVerified() { this.verified = true; }
    public Long getUserId() { return userId; }
    public String getStudentCode() { return studentCode; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getCitizenLast4() { return citizenLast4; }
    public String getAddress() { return address; }
    public String getNickname() { return nickname; }
    public boolean isVerified() { return verified; }
}