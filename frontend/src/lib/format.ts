const tz = 'Asia/Ho_Chi_Minh';

export const vnd = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('vi-VN').format(Math.round(Number(n))) + ' đ';

export const time = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: tz }) : '—';

export const timeSec = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz }) : '—';

export const date = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz }) : '—';

export const dateTime = (iso: string | null | undefined) => (iso ? `${time(iso)} · ${date(iso)}` : '—');

export const shortDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: tz }) : '—';

export const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const ago = (iso: string | null | undefined) => {
  if (!iso) return 'chưa có dữ liệu';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.max(0, s)} giây trước`;
  if (s < 3600) return `${Math.round(s / 60)} phút trước`;
  return `${Math.round(s / 3600)} giờ trước`;
};

/** datetime-local input (giờ VN) <-> ISO */
export const toLocalInput = (d: Date) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (s: string) => new Date(s).toISOString();

export const vehicleTypeLabel = (t: string | null | undefined) =>
  t === 'E_SCOOTER' ? 'Xe máy điện' : t === 'E_BIKE' ? 'Xe đạp điện' : t === 'E_MOTORBIKE' ? 'Mô tô điện' : t ?? '';

export const hubTypeLabel: Record<string, string> = { METRO: 'Cửa ngõ', DORM: 'Ký túc xá', CAMPUS: 'Học tập', SERVICE: 'Dịch vụ', ADMIN: 'Hành chính' };
