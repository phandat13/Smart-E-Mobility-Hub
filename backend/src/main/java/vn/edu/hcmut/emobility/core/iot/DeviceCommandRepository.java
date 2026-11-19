package vn.edu.hcmut.emobility.core.iot;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceCommandRepository extends JpaRepository<DeviceCommand, Long> {
    List<DeviceCommand> findByStatusOrderByIdAsc(CommandStatus status);
    Optional<DeviceCommand> findFirstByContextTypeAndContextIdAndCommandOrderByIdDesc(String contextType, Long contextId, CommandType command);
    List<DeviceCommand> findTop100ByOrderByIdDesc();
}
