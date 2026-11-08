package vn.edu.hcmut.emobility.account.dto;

import vn.edu.hcmut.emobility.account.entity.AppUser;
import vn.edu.hcmut.emobility.account.entity.StudentProfile;

public record UserResponse(Long id, String username, String role, String fullName, String status,
                           StudentInfo student) {
    public static UserResponse of(AppUser u, StudentProfile p) {
        return new UserResponse(u.getId(), u.getUsername(), u.getRole().name(), u.getFullName(),
                u.getStatus().name(), p == null ? null : StudentInfo.of(p));
    }
}
