package vn.edu.hcmut.emobility.module.hub;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    long countByHubId(Long hubId);
}
