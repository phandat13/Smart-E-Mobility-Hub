/** Hằng số cho các màn hình đăng nhập. */

export type InternalRole = 'OPERATOR' | 'DRIVER' | 'TECHNICIAN';

/** Khu vực làm việc hiển thị ở cổng nội bộ (chỉ là gợi ý giao diện, quyền do tài khoản quyết định). */
export const ROLE_OPTIONS: { value: InternalRole; label: string; description: string }[] = [
  { value: 'OPERATOR', label: 'Đơn vị vận hành', description: 'Quản lý mạng lưới Hub, điều phối xe' },
  { value: 'DRIVER', label: 'Tài xế điều chuyển', description: 'Cập nhật trạng thái vận chuyển xe' },
  { value: 'TECHNICIAN', label: 'Kỹ thuật viên', description: 'Bảo trì, xử lý sự cố hạ tầng' },
];

/** Các vai trò được phép vào cổng nội bộ. */
export const INTERNAL_ROLES: Record<string, true> = { OPERATOR: true, DRIVER: true, TECHNICIAN: true };
