// Ánh xạ trạng thái → nhãn tiếng Việt + màu pill (thống nhất mọi màn hình)
type Tone = 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'gray' | 'teal';
const M: Record<string, [string, Tone]> = {
  // xe
  AVAILABLE: ['Sẵn sàng', 'green'], RESERVED: ['Đã đặt trước', 'orange'], PICKUP_PENDING: ['Đang nhận xe', 'blue'],
  UNLOCK_RECONCILING: ['Chờ đối soát mở khóa', 'purple'], IN_USE: ['Đang sử dụng', 'blue'], RETURN_RECONCILING: ['Chờ đối soát trả', 'purple'],
  PENDING_CHECK: ['Chờ kiểm tra', 'orange'], NEEDS_CHARGE: ['Cần sạc', 'red'], CHARGING: ['Đang sạc', 'purple'],
  TRANSFER_LOCKED: ['Khóa điều chuyển', 'teal'], IN_TRANSIT: ['Đang vận chuyển', 'teal'], FAULTY: ['Báo lỗi', 'red'],
  MAINTENANCE_LOCKED: ['Khóa bảo trì', 'red'], OUT_OF_SERVICE: ['Ngừng vận hành', 'gray'],
  // đơn đặt xe
  PICKED_UP: ['Đã nhận xe', 'blue'], COMPLETED: ['Hoàn tất', 'green'], CANCELLED: ['Đã hủy', 'gray'], EXPIRED: ['Đã hết hạn', 'red'],
  // chuyến
  IN_PROGRESS: ['Đang diễn ra', 'blue'], RETURNING: ['Đang trả xe', 'blue'], PENDING_RECONCILIATION: ['Chờ đối soát', 'purple'],
  // đặt chỗ
  BOOKED: ['Đã đặt', 'blue'], CHECKOUT_REQUESTED: ['Đang dừng sạc', 'orange'], AWAITING_EXIT: ['Chờ xe rời vị trí', 'orange'],
  // ô / cổng
  HELD: ['Giữ cho điều chuyển', 'purple'], OCCUPIED: ['Có xe', 'orange'], MAINTENANCE: ['Bảo trì', 'red'], DISABLED: ['Ngừng', 'gray'],
  // hub / alert / sự cố / bảo trì
  ACTIVE: ['Hoạt động', 'green'], INACTIVE: ['Ngưng hoạt động', 'gray'], OPEN: ['Mới', 'red'], ACKNOWLEDGED: ['Đã tiếp nhận', 'orange'],
  RESOLVED: ['Đã xử lý', 'green'], ASSIGNED: ['Đã phân công', 'blue'], CLOSED: ['Đã đóng', 'gray'], PENDING: ['Chờ xử lý', 'orange'],
  DONE: ['Hoàn tất', 'green'], REPAIRING: ['Đang sửa', 'blue'], WAITING_PARTS: ['Chờ linh kiện', 'orange'], UNREPAIRABLE: ['Ngừng sử dụng', 'gray'],
  // điều chuyển
  QUEUED: ['Chờ tài xế', 'orange'], LOADING: ['Đang gom xe', 'blue'], PARTIALLY_DELIVERED: ['Đã giao một phần', 'teal'],
  COMPLETED_WITH_ISSUES: ['Hoàn tất – có sự cố', 'orange'], LOCKED: ['Đã khóa', 'gray'], LOADED: ['Đã gom', 'blue'],
  DELIVERED: ['Đã bàn giao', 'green'], FAILED: ['Hỏng/thất bại', 'red'], REMOVED: ['Đã loại', 'gray'],
  // lịch sạc
  DRAFT: ['Nháp', 'gray'], CONFIRMED: ['Đã xác nhận', 'green'], SUPERSEDED: ['Đã thay thế', 'gray'], DISCARDED: ['Đã hủy', 'gray'],
  SCHEDULED: ['Đã lên lịch', 'blue'], MISSED: ['Bỏ lỡ', 'red'], NEEDS_RESCHEDULE: ['Cần lập lại', 'orange'], STARTING: ['Đang khởi động', 'blue'],
  STOPPING: ['Đang dừng', 'orange'],
  // mô phỏng
  RUNNING: ['Đang chạy', 'blue'], PROPOSED: ['Đề xuất', 'blue'], APPLIED: ['Đã áp dụng', 'green'], REJECTED: ['Từ chối', 'gray'],
  // mức độ
  LOW: ['Thấp', 'gray'], MEDIUM: ['Trung bình', 'orange'], HIGH: ['Cao', 'red'], CRITICAL: ['Cao nhất', 'red'],
  INFO: ['Thông tin', 'blue'], WARNING: ['Cảnh báo', 'orange'],
};

export const statusLabel = (s: string | null | undefined) => (s ? M[s]?.[0] ?? s : '—');
export const statusTone = (s: string | null | undefined): Tone => (s ? M[s]?.[1] ?? 'gray' : 'gray');

export const alertTypeLabel: Record<string, string> = {
  OVERLOAD: 'Quá tải', IMBALANCE: 'Mất cân đối', DEVICE_ERROR: 'Xe/thiết bị lỗi', OFFLINE: 'Mất kết nối',
  RECONCILIATION: 'Chờ đối soát', CHARGING_CONFLICT: 'Xung đột lịch sạc', CAPACITY_CONFLICT: 'Xung đột sức chứa',
};
