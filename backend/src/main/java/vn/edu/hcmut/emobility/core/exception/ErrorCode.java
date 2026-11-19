package vn.edu.hcmut.emobility.core.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    // Chung
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dữ liệu"),
    CONFLICT(HttpStatus.CONFLICT, "Dữ liệu đã bị thay đổi bởi thao tác khác, vui lòng thử lại"),
    INVALID_STATE(HttpStatus.CONFLICT, "Trạng thái hiện tại không cho phép thao tác này"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, vui lòng thử lại sau"),

    // AC
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Thông tin đăng nhập không chính xác"),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    PORTAL_MISMATCH(HttpStatus.FORBIDDEN, "Tài khoản không thuộc cổng đăng nhập này"),
    ROLE_NOT_GRANTED(HttpStatus.FORBIDDEN, "Vai trò này chưa được cấp cho tài khoản"),
    ACCOUNT_NOT_ACTIVE(HttpStatus.FORBIDDEN, "Tài khoản chưa được xác thực hoặc đã bị khóa"),
    USERNAME_TAKEN(HttpStatus.CONFLICT, "Tên đăng nhập đã tồn tại"),
    PROFILE_DUPLICATED(HttpStatus.CONFLICT, "Mã số sinh viên, email, số điện thoại hoặc CCCD đã được đăng ký"),
    CITIZEN_ID_INVALID(HttpStatus.BAD_REQUEST, "Số CCCD không hợp lệ"),
    WRONG_PASSWORD(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng"),
    TRIP_ALREADY_RATED(HttpStatus.CONFLICT, "Chuyến đi đã được đánh giá"),

    // RE
    VEHICLE_UNAVAILABLE(HttpStatus.CONFLICT, "Phương tiện không còn khả dụng"),
    ACTIVE_RESERVATION_EXISTS(HttpStatus.CONFLICT, "Bạn đang có một đơn đặt xe hoặc chuyến đi còn hiệu lực"),
    RESERVATION_NOT_ACTIVE(HttpStatus.CONFLICT, "Đơn đặt xe không còn ở trạng thái giữ chỗ"),
    RESERVATION_EXPIRED(HttpStatus.GONE, "Đơn đặt xe đã hết hạn, vui lòng đặt lại từ đầu"),
    CANNOT_CANCEL_PICKED_UP(HttpStatus.CONFLICT, "Không thể hủy đơn đã nhận xe, vui lòng sử dụng chức năng trả xe"),
    MAX_EXTENSIONS_REACHED(HttpStatus.UNPROCESSABLE_ENTITY, "Đã đạt số lần gia hạn tối đa"),
    VEHICLE_HAS_OPERATION(HttpStatus.CONFLICT, "Phương tiện cần ưu tiên cho quy trình vận hành khác"),
    LOW_BATTERY(HttpStatus.UNPROCESSABLE_ENTITY, "Pin phương tiện dưới mức tối thiểu"),
    DEVICE_DATA_STALE(HttpStatus.UNPROCESSABLE_ENTITY, "Chưa nhận được dữ liệu cảm biến mới nhất của xe, vui lòng thử lại sau ít phút"),
    INVALID_RETURN_LOCATION(HttpStatus.UNPROCESSABLE_ENTITY, "Chưa nhận được xác nhận xe nằm trong vị trí đỗ hợp lệ"),
    TRIP_NOT_ACTIVE(HttpStatus.CONFLICT, "Chuyến đi không ở trạng thái đang sử dụng"),
    OTP_INVALID(HttpStatus.UNPROCESSABLE_ENTITY, "Mã OTP không hợp lệ hoặc đã hết hạn"),

    // PV
    PLATE_NUMBER_TAKEN(HttpStatus.CONFLICT, "Phương tiện này đã được đăng ký trước đó"),
    VEHICLE_HAS_BOOKINGS(HttpStatus.CONFLICT, "Phương tiện còn lịch đặt chỗ đỗ/sạc hoặc đang sạc tại Hub"),
    SLOT_UNAVAILABLE(HttpStatus.CONFLICT, "Ô đỗ hoặc cổng sạc không còn trống trong khung giờ này"),
    CONNECTOR_INCOMPATIBLE(HttpStatus.UNPROCESSABLE_ENTITY, "Không có cổng sạc tương thích với phương tiện"),
    CHECKIN_INVALID(HttpStatus.UNPROCESSABLE_ENTITY, "Mã QR hết hạn hoặc không khớp, vui lòng liên hệ nhân viên hỗ trợ tại Hub"),
    BOOKING_NOT_ACTIVE(HttpStatus.CONFLICT, "Phiên đặt chỗ không ở trạng thái phù hợp"),
    EXTEND_TOO_LATE(HttpStatus.UNPROCESSABLE_ENTITY, "Cần gia hạn trước khi hết phiên tối thiểu 15 phút"),

    // MO
    HUB_NAME_TAKEN(HttpStatus.CONFLICT, "Tên hoặc mã Hub đã tồn tại"),
    HUB_IN_USE(HttpStatus.CONFLICT, "Hub còn phương tiện đang hoạt động hoặc đơn đặt chỗ/sạc đang hiệu lực"),
    HUB_INACTIVE(HttpStatus.CONFLICT, "Hub đang ngưng hoạt động"),
    CAPACITY_BELOW_USAGE(HttpStatus.UNPROCESSABLE_ENTITY, "Không thể thấp hơn số lượng đang sử dụng thực tế"),
    HUB_FULL(HttpStatus.CONFLICT, "Hub không còn đủ chỗ đỗ trống"),
    PORT_IN_USE(HttpStatus.CONFLICT, "Cổng sạc đang có phương tiện kết nối"),
    VEHICLE_IN_SERVICE(HttpStatus.CONFLICT, "Phương tiện đang được đặt trước hoặc trong chuyến đi"),

    // RB, MT, SC, SI
    NO_FREE_DRIVER(HttpStatus.ACCEPTED, "Chưa có tài xế rảnh, lệnh được đưa vào hàng chờ"),
    VEHICLE_NOT_IN_ORDER(HttpStatus.UNPROCESSABLE_ENTITY, "Phương tiện không thuộc lệnh này"),
    TRANSFER_ITEM_STATE(HttpStatus.CONFLICT, "Trạng thái xe trong lệnh không cho phép thao tác này"),
    VEHICLE_IN_OTHER_OPERATION(HttpStatus.CONFLICT, "Có xe đang nằm trong lệnh điều chuyển, đơn đặt trước hoặc chuyến đi"),
    INCIDENT_ALREADY_OPEN(HttpStatus.CONFLICT, "Tài nguyên đã có phiếu sự cố đang mở"),
    SCHEDULE_OVERLAP(HttpStatus.CONFLICT, "Lịch sạc bị chồng lấn trên cùng cổng"),
    SCHEDULE_NOT_EDITABLE(HttpStatus.CONFLICT, "Lịch sạc không còn ở trạng thái cho phép chỉnh sửa"),
    SESSION_IN_PROGRESS(HttpStatus.CONFLICT, "Phiên sạc đang diễn ra, không thể đổi giờ hoặc cổng"),
    INSUFFICIENT_DATA(HttpStatus.UNPROCESSABLE_ENTITY, "Không đủ dữ liệu trạng thái để thực hiện"),
    SCENARIO_INVALID(HttpStatus.BAD_REQUEST, "Tham số kịch bản không hợp lệ"),
    SCENARIO_NAME_TAKEN(HttpStatus.CONFLICT, "Tên kịch bản đã tồn tại"),
    SIMULATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "Mô phỏng thất bại, dữ liệu thật không bị ảnh hưởng"),
    PREVIEW_TOKEN_INVALID(HttpStatus.PRECONDITION_FAILED, "Kết quả kiểm tra lại đã cũ, vui lòng kiểm tra lại trước khi áp dụng"),
    RECOMMENDATION_INFEASIBLE(HttpStatus.UNPROCESSABLE_ENTITY, "Khuyến nghị không còn khả thi với trạng thái thực tế"),

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
