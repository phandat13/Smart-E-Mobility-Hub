package vn.edu.hcmut.emobility.simulation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationRunRepository extends JpaRepository<SimulationRun, Long> {
    List<SimulationRun> findTop50ByOrderByIdDesc();
}
