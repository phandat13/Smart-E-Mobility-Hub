export const vehicleStatusLabel: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  RESERVED: 'Đã đặt trước',
  PICKUP_PENDING: 'Đang xử lý nhận xe',
  IN_USE: 'Đang sử dụng',
  PENDING_CHECK: 'Chờ kiểm tra',
  NEEDS_CHARGE: 'Cần sạc',
  CHARGING: 'Đang sạc',
  TRANSFER_LOCKED: 'Đang điều chuyển',
  FAULTY: 'Báo lỗi',
  MAINTENANCE_LOCKED: 'Bảo trì',
  OUT_OF_SERVICE: 'Ngừng hoạt động',
}

export const vehicleTypeLabel: Record<string, string> = {
  E_BIKE: 'Xe đạp điện',
  E_SCOOTER: 'Xe máy điện',
}

export const reservationStatusLabel: Record<string, string> = {
  RESERVED: 'Đã đặt trước',
  PICKED_UP: 'Đã nhận xe',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
}

export const reservationTabLabel: Record<string, string> = {
  ALL: 'Tất cả',
  RESERVED: 'Đang giữ chỗ',
  PICKED_UP: 'Đã nhận xe',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
}

export const incidentCategoryLabel: Record<string, string> = {
  DAMAGE: 'Hư hỏng thân xe / phụ kiện',
  BRAKE_LIGHT: 'Phanh / đèn không hoạt động',
  BATTERY: 'Pin / không lên nguồn',
  LOCK: 'Khóa xe không đóng/mở được',
  CHARGING_PORT: 'Cổng sạc lỗi',
  OTHER: 'Khác',
}

export const errorMessage: Record<string, string> = {
  NETWORK_ERROR: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.',
  UNAUTHORIZED: 'Vui lòng đăng nhập.',
  TOKEN_INVALID: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  CONFLICT: 'Dữ liệu đã bị thay đổi bởi thao tác khác, vui lòng thử lại.',
  VEHICLE_UNAVAILABLE: 'Phương tiện không còn khả dụng. Vui lòng chọn xe khác.',
  ACTIVE_RESERVATION_EXISTS: 'Bạn đang có một đơn đặt xe còn hiệu lực.',
  VEHICLE_HAS_OPERATION: 'Phương tiện đã được lên kế hoạch vận hành. Vui lòng chọn xe khác.',
  LOW_BATTERY: 'Pin phương tiện dưới mức tối thiểu. Vui lòng chọn xe khác.',
  RESERVATION_NOT_ACTIVE: 'Đơn đặt xe không còn ở trạng thái giữ chỗ.',
  RESERVATION_EXPIRED: 'Đơn đặt xe đã hết hạn.',
  MAX_EXTENSIONS_REACHED: 'Đơn đã được gia hạn tối đa số lần cho phép.',
  ACTIVE_TRIP_EXISTS: 'Bạn đang có một chuyến đi chưa kết thúc.',
  WRONG_VEHICLE: 'Mã xe không khớp với xe trong đơn đặt trước của bạn.',
  VEHICLE_NOT_AT_HUB: 'Cảm biến chưa xác nhận xe đứng yên tại Hub. Vui lòng chọn xe khác.',
  INCIDENT_ALREADY_OPEN: 'Xe đang có sự cố chưa xử lý. Vui lòng chọn xe khác.',
  IOT_TIMEOUT: 'Thiết bị không phản hồi.',
  IOT_COMMAND_FAILED: 'Thiết bị báo lỗi khi thực hiện lệnh.',
  INVALID_RETURN_LOCATION: 'Phương tiện chưa ở vị trí đỗ hợp lệ. Điều chỉnh xe trong ô đỗ hoặc xác nhận thủ công.',
  OTP_INVALID: 'Mã OTP không đúng hoặc đã hết hạn.',
  PAYMENT_FAILED: 'Không tính được chi phí, vui lòng thử lại.',
  TRIP_ALREADY_RATED: 'Chuyến đi đã được đánh giá.',
}

export function errorText(code: string, serverMessage?: string): string {
  return errorMessage[code] ?? serverMessage ?? 'Lỗi hệ thống, vui lòng thử lại sau.'
}
