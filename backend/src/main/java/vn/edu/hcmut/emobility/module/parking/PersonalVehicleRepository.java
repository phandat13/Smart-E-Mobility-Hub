package vn.edu.hcmut.emobility.module.parking;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonalVehicleRepository extends JpaRepository<PersonalVehicle, Long> {

    boolean existsByPlateNumber(String plateNumber);

    List<PersonalVehicle> findByOwnerIdOrderByIdDesc(Long ownerId);

    Optional<PersonalVehicle> findByIdAndOwnerId(Long id, Long ownerId);
}
