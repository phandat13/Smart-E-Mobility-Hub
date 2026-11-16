import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { displayDay, halfHourOptions } from './format';
import './ui.css';

export function Button({ tone = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' | 'soft' | 'danger' }) {
  return <button type="button" className={`ui-button ui-button--${tone} ${className}`} {...props} />;
}
export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate' }) { return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>; }
export function Notice({ children, tone = 'info', role }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' | 'error' | 'neutral'; role?: 'alert' | 'status' }) { return <div className={`ui-notice ui-notice--${tone}`} role={role}>{children}</div>; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="ui-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Summary({ rows }: { rows: [string, ReactNode][] }) { return <dl className="ui-summary">{rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>; }
export function Empty({ title, children, to, action }: { title: string; children?: ReactNode; to?: string; action?: string }) { return <section className="ui-empty"><div aria-hidden="true">◇</div><h2>{title}</h2>{children && <p>{children}</p>}{to && <Link className="ui-button ui-button--primary" to={to}>{action ?? 'Tiếp tục'}</Link>}</section>; }
export function useAction() {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function run<T>(action: () => Promise<T>, onSuccess?: (result: T) => void) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(''); setSuccess('');
    try { const result = await action(); onSuccess?.(result); return result; }
    catch (e) { setError(e instanceof Error ? e.message : 'Có lỗi xảy ra. Vui lòng thử lại.'); }
    finally { busy.current = false; setPending(false); }
  }
  return { pending, error, success, run, setError, setSuccess };
}
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) { return <>{action.error && <Notice tone="error" role="alert">{action.error}</Notice>}{action.success && <Notice tone="success" role="status">{action.success}</Notice>}</>; }
export function Modal({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const node = ref.current!; node.showModal(); return () => node.close(); }, []);
  return <dialog ref={ref} className={`ui-modal ${wide ? 'ui-modal--wide' : ''}`} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="ui-modal__heading"><h2 id={id}>{title}</h2><button type="button" className="ui-icon-button" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}>×</button></div>{children}
  </dialog>;
}
export function PhotoUpload({ photos, onChange }: { photos: string[]; onChange: (photos: string[]) => void }) {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  async function read(files: File[]) {
    setError('');
    if (files.length + photos.length > 3) { setError('Tối đa 3 ảnh.'); return; }
    if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024)) { setError('Mỗi ảnh PNG, JPEG hoặc WebP phải không quá 1 MB.'); return; }
    setReading(true);
    try {
      const urls = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file); })));
      onChange([...photos, ...urls]);
    } catch { setError('Không đọc được ảnh. Vui lòng chọn lại.'); } finally { setReading(false); }
  }
  return <div className="ui-upload"><div className="ui-upload__list">{photos.map((photo, index) => <div className="ui-upload__thumb" key={`${index}-${photo.slice(-20)}`}><img src={photo} alt={`Ảnh hiện trường ${index + 1}`} /><button type="button" aria-label={`Xóa ảnh ${index + 1}`} disabled={reading} onClick={() => onChange(photos.filter((_, i) => i !== index))}>×</button></div>)}{Array.from({ length: 3 - photos.length }, (_, slot) => <label className="ui-upload__add" key={`add-${slot}`}><span aria-hidden="true">+</span><span className="sr-only">Thêm ảnh hiện trường</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={reading} onChange={event => { void read(Array.from(event.target.files ?? [])); event.target.value = ''; }} /></label>)}</div><small>{reading ? 'Đang đọc ảnh…' : 'Tối đa 3 ảnh · PNG, JPEG, WebP · 1 MB / ảnh'}</small>{error && <Notice tone="error" role="alert">{error}</Notice>}</div>;
}

/** Date field that always shows dd/mm/yyyy (Figma format) regardless of the browser locale; the native picker stays available. */
export function DateInput({ value, onChange, min, label }: { value: string; onChange: (value: string) => void; min?: string; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => { const input = ref.current; if (!input) return; try { input.showPicker(); } catch { input.focus(); } };
  return <span className="ui-date"><input ref={ref} className="ui-date__native" type="date" required aria-label={label} min={min} value={value} onChange={e => onChange(e.target.value)} /><button type="button" className="ui-date__display" tabIndex={-1} aria-hidden="true" onClick={open}><span>{displayDay(value) || 'dd/mm/yyyy'}</span><span>📅</span></button></span>;
}
/** 24-hour time selector in 30-minute steps (15:00, 15:30, …). */
export function TimeSelect({ value, onChange, label }: { value: string; onChange: (value: string) => void; label?: string }) {
  const options = halfHourOptions.includes(value) ? halfHourOptions : [...halfHourOptions, value].sort();
  return <select required aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>;
}
