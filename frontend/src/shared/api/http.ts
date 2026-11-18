/**
 * Lớp gọi API dùng chung. Bám format lỗi của backend (core/exception/ApiError.java):
 * { code, message, details, path, timestamp }. Màn hình chỉ switch theo `code`.
 */

export const API_BASE = '/api/v1'

const TOKEN_KEY = 'unigo.token'

export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
  path?: string
  timestamp?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.status = status
    this.code = body.code
    this.details = body.details ?? {}
  }
}

// Lệch giờ giữa server và máy người dùng, tính từ header `Date` của mỗi response.
// Đếm ngược phải dựa trên expiresAt − serverNow, không dựa vào đồng hồ máy (A.2).
let serverOffsetMs = 0

export function serverNow(): number {
  return Date.now() + serverOffsetMs
}

function syncServerClock(res: Response) {
  const header = res.headers.get('Date')
  const serverMs = header ? Date.parse(header) : NaN
  if (!Number.isNaN(serverMs)) serverOffsetMs = serverMs - Date.now()
}

// Chưa có API đăng nhập (module AC). Token được đặt tạm vào localStorage khi chạy với backend thật.
function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** Trả `null` khi server trả 204 No Content. */
export async function request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = readToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: 'Không kết nối được máy chủ' })
  }

  syncServerClock(res)
  if (res.status === 204) return null

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const fallback: ApiErrorBody = { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, vui lòng thử lại sau' }
    throw new ApiError(res.status, data && typeof data.code === 'string' ? data : fallback)
  }
  return data as T
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
}
