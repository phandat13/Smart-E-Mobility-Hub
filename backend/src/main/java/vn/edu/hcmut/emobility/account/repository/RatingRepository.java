package vn.edu.hcmut.emobility.account.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hcmut.emobility.account.entity.Rating;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    boolean existsByTripId(Long tripId);
    Optional<Rating> findByTripId(Long tripId);
}
