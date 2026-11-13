import type { LoadFilter, Tone } from './types';

// Ngưỡng mã màu theo mức tải (khớp thiết kế: 94%/91% đỏ, 72%/66% cam, 38%/55% xanh).
// Ngưỡng 90% lấy từ mục 2.3 của spec; ngưỡng 60% là suy ra từ Figma -> cần nhóm xác nhận.
export const OVERLOAD_PCT = 90;
export const HIGH_PCT = 60;

export const REFRESH_INTERVAL_MS = 30_000;

export const REGION_OPTIONS = ['Khu Đông', 'Khu Tây', 'Khu Trung tâm', 'Khu cửa ngõ'];
export const HUB_TYPE_OPTIONS = [
  'Hub cửa ngõ',
  'Khu ký túc xá',
  'Khu học tập',
  'Khu hành chính',
  'Khu dịch vụ',
];
export const LOAD_OPTIONS: { value: LoadFilter; label: string }[] = [
  { value: 'overload', label: 'Quá tải (≥ 90%)' },
  { value: 'high', label: 'Cao (60–89%)' },
  { value: 'normal', label: 'Bình thường (< 60%)' },
  { value: 'offline', label: 'Mất kết nối' },
];

export function loadTone(pct: number): Tone {
  if (pct >= OVERLOAD_PCT) return 'danger';
  if (pct >= HIGH_PCT) return 'warning';
  return 'success';
}
