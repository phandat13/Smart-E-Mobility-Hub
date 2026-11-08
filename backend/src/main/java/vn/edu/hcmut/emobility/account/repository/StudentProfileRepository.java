package vn.edu.hcmut.emobility.account.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hcmut.emobility.account.entity.StudentProfile;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByUserId(Long userId);
    boolean existsByStudentCode(String studentCode);
    boolean existsByEmail(String email);
    boolean existsByCitizenIdHash(String citizenIdHash);
}
