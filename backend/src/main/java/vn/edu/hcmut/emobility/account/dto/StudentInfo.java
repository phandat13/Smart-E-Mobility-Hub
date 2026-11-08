package vn.edu.hcmut.emobility.account.dto;

import vn.edu.hcmut.emobility.account.entity.StudentProfile;

public record StudentInfo(String studentCode, String phone, String email, String citizenIdMasked,
                          String address, String nickname, boolean verified) {
    public static StudentInfo of(StudentProfile p) {
        return new StudentInfo(p.getStudentCode(), p.getPhone(), p.getEmail(),
                "********" + p.getCitizenIdLast4(), p.getAddress(), p.getNickname(), p.isVerified());
    }
}
