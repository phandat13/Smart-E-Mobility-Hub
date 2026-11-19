import type { ApiError } from './types';

const TOKEN_KEY = 'unigo.token';

export class HttpError extends Error {
  status: number;
  body: ApiError | null;
  constructor(status: number, body: ApiError | null, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
  get code() { return this.body?.code ?? 'HTTP_' + this.status; }
  get fields(): Record<string, string> {
    const d = this.body?.details ?? {};
    const out: Record<string, string> = {};
    Object.entries(d).forEach(([k, v]) => { if (typeof v === 'string') out[k] = v; });
    return out;
  }
  detail<T>(key: string): T | undefined { return this.body?.details?.[key] as T | undefined; }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

export interface RequestOptions { method?: string; body?: unknown; headers?: Record<string, string>; raw?: boolean }

/** Gọi API; trả về { data, status } để phân biệt 200 (hoàn tất) và 202 (chờ đối soát). */
export async function call<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; status: number }> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers ?? {}) };
  const token = tokenStore.get();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(path, { method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  } catch {
    throw new HttpError(0, null, 'Mất kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.');
  }
  const text = await res.text();
  const json = text ? safeJson(text) : null;
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized && !path.endsWith('/auth/login')) onUnauthorized();
    const body = json as ApiError | null;
    throw new HttpError(res.status, body, body?.message ?? `Lỗi ${res.status}`);
  }
  return { data: json as T, status: res.status };
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return (await call<T>(path, opts)).data;
}

function safeJson(t: string): unknown {
  try { return JSON.parse(t); } catch { return null; }
}

export function newIdempotencyKey(): string {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
