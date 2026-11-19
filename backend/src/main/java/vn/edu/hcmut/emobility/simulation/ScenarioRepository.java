package vn.edu.hcmut.emobility.simulation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScenarioRepository extends JpaRepository<Scenario, Long> {
    List<Scenario> findAllByOrderByIdDesc();
    boolean existsByNameIgnoreCase(String name);
}
