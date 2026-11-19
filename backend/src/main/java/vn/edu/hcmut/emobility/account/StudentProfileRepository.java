package vn.edu.hcmut.emobility.account;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByUserId(Long userId);
    boolean existsByStudentCode(String code);
    boolean existsByEmail(String email);
    boolean existsByPhoneHash(String hash);
    boolean existsByCitizenIdHash(String hash);
}
