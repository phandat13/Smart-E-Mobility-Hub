package vn.edu.hcmut.emobility.personal;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonalVehicleRepository extends JpaRepository<PersonalVehicle, Long> {
    List<PersonalVehicle> findByOwnerIdAndActiveTrueOrderById(Long ownerId);
    boolean existsByPlateNumberAndActiveTrue(String plate);
    Optional<PersonalVehicle> findByPlateNumberAndActiveTrue(String plate);
}
