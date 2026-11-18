// Mọi thời điểm từ API là ISO 8601 UTC; hiển thị theo giờ Việt Nam.
const TZ = 'Asia/Ho_Chi_Minh'

const timeFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
const dateFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })

/** "14:32" */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

/** "14:32 · 07/10/2026" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${timeFmt.format(d)} · ${dateFmt.format(d)}`
}

/** Số mili giây còn lại → "mm:ss" (không âm). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 36 → "~36 km" */
export function formatRange(km: number): string {
  return `~${Math.round(km)} km`
}
