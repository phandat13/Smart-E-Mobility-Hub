export const money = (amount: number) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} đ`;
export const time = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
export const date = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const dayInput = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)!.value).join('-');
};
export const dayMonth = (value: string) =>
  dayInput(value).split('-').reverse().slice(0, 2).join('/');
export const weekdayDate = (value: string) => {
  const weekday = new Date(value).toLocaleDateString('vi-VN', {
    weekday: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date(value)}`;
};
/** dd/mm/yyyy from a yyyy-mm-dd input value, independent of the browser locale. */
export const displayDay = (day: string) => (day ? day.split('-').reverse().join('/') : '');
/** 24-hour HH:mm options in 30-minute steps for locale-independent time pickers. */
export const halfHourOptions = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
);
export const shortConnector = (connector: string) => connector.split(' / ')[0];
export const resourceType = (resource: { id: string; name: string; kind: 'VEHICLE' | 'PORT' }) =>
  resource.kind === 'VEHICLE' ? resource.name.replace(` ${resource.id}`, '') : 'Cổng sạc';
export const resourceTitle = (resource: { id: string; name: string; kind: 'VEHICLE' | 'PORT' }) =>
  resource.kind === 'VEHICLE'
    ? `${resource.id} · ${resourceType(resource)}`
    : `${resource.name} · ${resource.id}`;
export const localDateTime = (value: string) => `${dayInput(value)}T${time(value)}`;
export const atVietnam = (day: string, clock: string) =>
  new Date(`${day}T${clock}:00+07:00`).toISOString();
export const addMinutes = (value: string, minutes: number) =>
  new Date(Date.parse(value) + minutes * 60000).toISOString();
export const duration = (start: string, end: string) =>
  Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
export const serviceLabel = { PARK: 'Chỉ đỗ xe', CHARGE: 'Chỉ sạc xe', BOTH: 'Đỗ xe + Sạc' };
export const priorityLabel = { HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' };
export const progressLabel = {
  REPAIRING: 'Đang sửa',
  WAITING_PARTS: 'Chờ linh kiện',
  DONE: 'Hoàn tất',
  UNREPAIRABLE: 'Ngừng sử dụng',
};
export const resourceLabel = {
  FAULTY: 'Báo lỗi',
  IN_USE: 'Đang sử dụng',
  AVAILABLE: 'Sẵn sàng',
  MAINTENANCE_LOCKED: 'Khóa bảo trì',
  PENDING_CHECK: 'Chờ kiểm tra',
  NEEDS_CHARGE: 'Cần sạc',
  OUT_OF_SERVICE: 'Ngừng sử dụng',
};
export const bookingLabel = {
  BOOKED: 'Đã xác nhận',
  IN_USE: 'Đang sử dụng',
  COMPLETED: 'Đã kết thúc',
  EXPIRED: 'Quá hạn check-in',
  CANCELLED: 'Đã hủy',
};
