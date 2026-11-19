package vn.edu.hcmut.emobility.core.iot;

/**
 * Kết quả gửi lệnh. UNKNOWN = hết thời gian chờ/mất kết nối trước khi nhận phản hồi:
 * thiết bị CÓ THỂ đã thực hiện (góp ý #5) → không được coi như thất bại.
 */
public enum CommandOutcome { SUCCESS, FAILED, UNKNOWN }
