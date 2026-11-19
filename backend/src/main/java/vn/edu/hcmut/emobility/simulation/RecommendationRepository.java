package vn.edu.hcmut.emobility.simulation;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {
    List<Recommendation> findByRunIdOrderById(Long runId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Recommendation r where r.id = :id")
    Optional<Recommendation> lockById(@Param("id") Long id);
}
