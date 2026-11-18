const TZ = 'Asia/Ho_Chi_Minh'

const timeFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
const timeSecFmt = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})
const dateFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
const moneyFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const kmFmt = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

export function formatTimeWithSeconds(iso: string): string {
  return timeSecFmt.format(new Date(iso))
}

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${timeFmt.format(d)} · ${dateFmt.format(d)}`
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.max(1, Math.ceil((Date.parse(toIso) - Date.parse(fromIso)) / 60_000))
}

export function formatRange(km: number): string {
  return `~${Math.round(km)} km`
}

export function formatKm(km: number): string {
  return `${kmFmt.format(km)} km`
}

export function formatMoney(vnd: number): string {
  return `${moneyFmt.format(vnd)} đ`
}
