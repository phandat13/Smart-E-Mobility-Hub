package vn.edu.hcmut.emobility.rental;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    Optional<Rating> findByTripId(Long tripId);
}
