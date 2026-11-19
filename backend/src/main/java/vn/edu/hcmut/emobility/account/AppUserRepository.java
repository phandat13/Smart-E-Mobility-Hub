package vn.edu.hcmut.emobility.account;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hcmut.emobility.core.security.Role;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
    boolean existsByUsername(String username);

    @Query("select u from AppUser u join u.roles r where r = :role and u.status = vn.edu.hcmut.emobility.account.UserStatus.ACTIVE order by u.fullName")
    List<AppUser> findActiveByRole(@Param("role") Role role);
}
