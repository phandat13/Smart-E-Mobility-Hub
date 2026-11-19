package vn.edu.hcmut.emobility.core.iot;

import java.util.Optional;

/** Cổng giao tiếp thiết bị tại Hub (hệ thống bên ngoài). Cơ chế điều khiển vật lý ngoài phạm vi. */
public interface IotGateway {

    /** Gửi lệnh và chờ phản hồi trong thời gian quy định. Không bao giờ ném lỗi: lỗi mạng → UNKNOWN. */
    CommandOutcome send(DeviceType type, Long deviceId, CommandType command);

    /** Đọc lại trạng thái thực tế của thiết bị; rỗng nếu không liên lạc được. */
    Optional<DeviceState> query(DeviceType type, Long deviceId);
}
