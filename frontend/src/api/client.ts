export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const BASE = import.meta.env.VITE_API_BASE ?? '';

export interface ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('auth') || sessionStorage.getItem('auth');
    if (!stored) return null;
    const { token, expiresAt } = JSON.parse(stored);
    if (expiresAt && new Date(expiresAt) <= new Date()) return null;
    return token;
  } catch {
    return null;
  }
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) } });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    // Đăng nhập sai cũng trả 401 nhưng đó không phải phiên hết hạn.
    if (res.status === 401 && onUnauthorized && !path.includes('/auth/login')) {
      onUnauthorized();
    }
    let err: ApiRequestError;
    try {
      const body = await res.json();
      err = new Error(body.message || `HTTP ${res.status}`) as ApiRequestError;
      err.status = res.status;
      err.code = body.code;
      err.details = body.details;
    } catch {
      err = new Error(`HTTP ${res.status}`) as ApiRequestError;
      err.status = res.status;
    }
    throw err;
  }

  return (await res.json()) as T;
}
