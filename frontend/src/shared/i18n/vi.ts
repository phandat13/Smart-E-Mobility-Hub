/**
 * Nhãn tiếng Việt cho enum code từ API (A.2: API trả code, FE map sang nhãn).
 * Enum bám đúng backend hiện tại (module/hub/Vehicle.java, module/rental/Reservation.java).
 */

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

/** Thông báo cho từng mã lỗi; mã không có ở đây thì dùng `message` server gửi. */
export const errorMessage: Record<string, string> = {
  NETWORK_ERROR: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  UNAUTHORIZED: 'Vui lòng đăng nhập.',
  TOKEN_INVALID: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  CONFLICT: 'Dữ liệu đã bị thay đổi bởi thao tác khác, vui lòng thử lại.',
  VEHICLE_UNAVAILABLE: 'Phương tiện không còn khả dụng. Vui lòng chọn xe khác.',
  ACTIVE_RESERVATION_EXISTS: 'Bạn đang có một đơn đặt xe còn hiệu lực.',
  VEHICLE_HAS_OPERATION: 'Phương tiện đã được lên kế hoạch vận hành. Vui lòng chọn xe khác.',
  LOW_BATTERY: 'Pin phương tiện dưới mức tối thiểu. Vui lòng chọn xe khác.',
}

export function errorText(code: string, serverMessage?: string): string {
  return errorMessage[code] ?? serverMessage ?? 'Lỗi hệ thống, vui lòng thử lại sau.'
}
