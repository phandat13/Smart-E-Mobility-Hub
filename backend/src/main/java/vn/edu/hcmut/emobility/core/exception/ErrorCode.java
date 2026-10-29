package vn.edu.hcmut.emobility.core.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    // Chung
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dữ liệu"),
    CONFLICT(HttpStatus.CONFLICT, "Dữ liệu đã bị thay đổi bởi thao tác khác, vui lòng thử lại"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, vui lòng thử lại sau"),

    // AC
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Tên đăng nhập hoặc mật khẩu không chính xác"),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    USERNAME_TAKEN(HttpStatus.CONFLICT, "Tên đăng nhập đã tồn tại"),
    CITIZEN_ID_INVALID(HttpStatus.BAD_REQUEST, "Số CCCD/CMND không hợp lệ"),
    TRIP_ALREADY_RATED(HttpStatus.CONFLICT, "Chuyến đi đã được đánh giá"),

    // RE
    VEHICLE_UNAVAILABLE(HttpStatus.CONFLICT, "Phương tiện không còn khả dụng"),
    ACTIVE_RESERVATION_EXISTS(HttpStatus.CONFLICT, "Bạn đang có một đơn đặt xe còn hiệu lực"),
    RESERVATION_NOT_ACTIVE(HttpStatus.CONFLICT, "Đơn đặt xe không còn ở trạng thái giữ chỗ"),
    RESERVATION_EXPIRED(HttpStatus.GONE, "Đơn đặt xe đã hết hạn"),
    MAX_EXTENSIONS_REACHED(HttpStatus.UNPROCESSABLE_ENTITY, "Đã đạt số lần gia hạn tối đa"),
    VEHICLE_HAS_OPERATION(HttpStatus.CONFLICT, "Phương tiện đã được lên kế hoạch vận hành"),
    LOW_BATTERY(HttpStatus.UNPROCESSABLE_ENTITY, "Pin phương tiện dưới mức tối thiểu"),
    INVALID_RETURN_LOCATION(HttpStatus.UNPROCESSABLE_ENTITY, "Phương tiện chưa ở vị trí đỗ hợp lệ"),

    // PV
    PLATE_NUMBER_TAKEN(HttpStatus.CONFLICT, "Biển số đã được đăng ký"),
    VEHICLE_HAS_BOOKINGS(HttpStatus.CONFLICT, "Phương tiện còn lịch đặt hoặc đang sạc"),
    SLOT_UNAVAILABLE(HttpStatus.CONFLICT, "Ô đỗ hoặc cổng sạc không còn trống trong khung giờ này"),
    CHECKIN_INVALID(HttpStatus.UNPROCESSABLE_ENTITY, "Mã QR không hợp lệ hoặc ngoài khung giờ"),

    // MO
    HUB_NAME_TAKEN(HttpStatus.CONFLICT, "Tên Hub đã tồn tại"),
    HUB_IN_USE(HttpStatus.CONFLICT, "Hub còn phương tiện đang sử dụng hoặc đơn còn hiệu lực"),
    CAPACITY_BELOW_USAGE(HttpStatus.UNPROCESSABLE_ENTITY, "Sức chứa nhỏ hơn số chỗ đang sử dụng"),
    HUB_FULL(HttpStatus.CONFLICT, "Hub đã hết chỗ"),
    PORT_IN_USE(HttpStatus.CONFLICT, "Cổng sạc đang có phương tiện kết nối"),

    // RB, MT, SC, SI
    NO_FREE_DRIVER(HttpStatus.ACCEPTED, "Chưa có tài xế rảnh, lệnh được đưa vào hàng chờ"),
    VEHICLE_NOT_IN_ORDER(HttpStatus.UNPROCESSABLE_ENTITY, "Phương tiện không thuộc lệnh này"),
    INCIDENT_ALREADY_OPEN(HttpStatus.CONFLICT, "Tài nguyên đã có phiếu sự cố đang mở"),
    SCHEDULE_OVERLAP(HttpStatus.CONFLICT, "Lịch sạc bị chồng lấn trên cùng cổng"),
    SCENARIO_INVALID(HttpStatus.BAD_REQUEST, "Tham số kịch bản không hợp lệ"),
    SIMULATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "Mô phỏng thất bại, dữ liệu thật không bị ảnh hưởng"),

    // IoT
    IOT_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "Thiết bị không phản hồi"),
    IOT_COMMAND_FAILED(HttpStatus.BAD_GATEWAY, "Thiết bị báo lỗi khi thực hiện lệnh"),
    PAYMENT_FAILED(HttpStatus.BAD_GATEWAY, "Không tính được chi phí, vui lòng thử lại");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() { return status; }
    public String getMessage() { return message; }
}
