import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { HttpError } from '../api/client';
import { ago, timeSec } from '../lib/format';
import { statusLabel, statusTone } from '../lib/status';

// ---------------------------------------------------------------- toast
type ToastKind = 'info' | 'success' | 'error';
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; kind: ToastKind }[]>([]);
  const push = useCallback((msg: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">{items.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Hiển thị lỗi API thống nhất. */
export function errorText(e: unknown): string {
  if (e instanceof HttpError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

// ---------------------------------------------------------------- basics
export function Pill({ status, label, tone }: { status?: string | null; label?: string; tone?: string }) {
  return <span className={`pill ${tone ?? statusTone(status)}`}><span className="dot" />{label ?? statusLabel(status)}</span>;
}

export function Battery({ value, showText = true }: { value: number | null | undefined; showText?: boolean }) {
  const v = value ?? 0;
  const tone = v < 20 ? 'red' : v < 50 ? 'orange' : 'green';
  return (
    <div className="battery">
      <div className={`bar ${tone}`}><span style={{ width: `${v}%` }} /></div>
      {showText && <span className="small bold" style={{ minWidth: 34, textAlign: 'right' }}>{v}%</span>}
    </div>
  );
}

export function Spinner() { return <span className="spinner" />; }
export function Loading({ text = 'Đang tải dữ liệu…' }: { text?: string }) {
  return <div className="loading"><Spinner /><div className="mt-8">{text}</div></div>;
}
export function Empty({ icon = '🗂️', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return <div className="empty"><div className="big">{icon}</div><div className="bold">{title}</div>{children && <div className="mt-8">{children}</div>}</div>;
}
export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="banner error">⚠️ {errorText(error)}</div>;
}
export function KV({ k, v }: { k: ReactNode; v: ReactNode }) {
  return <div className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>;
}

/** Góp ý #1: luôn hiển thị thời điểm dữ liệu được cập nhật; cảnh báo khi dữ liệu cũ. */
export function Updated({ at, stale, refreshSeconds }: { at: string | null | undefined; stale?: boolean; refreshSeconds?: number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 5000); return () => clearInterval(t); }, []);
  return (
    <span className={`updated ${stale ? 'stale' : ''}`} title={at ?? ''}>
      <span className="live-dot" />
      {stale ? 'Dữ liệu có thể không chính xác · ' : 'Cập nhật '}
      {at ? `${timeSec(at)} (${ago(at)})` : 'chưa có dữ liệu'}
      {refreshSeconds ? ` · tự làm mới mỗi ${refreshSeconds} giây` : ''}
    </span>
  );
}

// ---------------------------------------------------------------- modal
export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>{children}</div>
    </div>
  );
}

export function ConfirmModal({ open, icon = '❓', tone, title, body, confirmText = 'Xác nhận', danger, busy, onConfirm, onClose, children }: {
  open: boolean; icon?: string; tone?: 'red' | 'green' | 'orange'; title: string; body?: ReactNode; confirmText?: string; danger?: boolean; busy?: boolean;
  onConfirm: () => void; onClose: () => void; children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className={`modal-icon ${tone ?? ''}`}>{icon}</div>
      <h2 className="center">{title}</h2>
      {body && <div className="center muted mt-8">{body}</div>}
      {children && <div className="mt-16">{children}</div>}
      <div className="row mt-24">
        <button className="btn ghost block" onClick={onClose} disabled={busy}>Để sau</button>
        <button className={`btn block ${danger ? 'danger' : ''}`} onClick={onConfirm} disabled={busy}>{busy ? <Spinner /> : confirmText}</button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- form helpers
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => <button type="button" key={i} className={i <= value ? 'on' : ''} onClick={() => onChange(i)}>★</button>)}
    </span>
  );
}

export function Qr({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(value, { margin: 1, width: size }).then(setSrc).catch(() => setSrc('')); }, [value, size]);
  return src ? <img className="qr" src={src} width={size} height={size} alt="Mã QR" /> : <div className="qr" />;
}
