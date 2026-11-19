import { useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { errorText, useToast } from './ui';

/**
 * Bảng GIẢ LẬP THIẾT BỊ (chỉ phục vụ demo MVP – mục 1.3: dữ liệu trạng thái được giả lập).
 * Mỗi nút gửi bản tin cảm biến/đặt kết quả lệnh qua /api/v1/sim, đi đúng đường ống như thiết bị thật.
 */
export function SimPanel({ title = 'Giả lập thiết bị (demo)', children }: { title?: string; children: ReactNode }) {
  return <div className="sim-panel"><div className="title">🧪 {title}</div><div className="row wrap">{children}</div></div>;
}

export function SimButton({ label, path, body, onDone, tone = 'ghost' }: { label: string; path: string; body?: unknown; onDone?: () => void; tone?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button className={`btn sm ${tone}`} disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        await api(path, { body: body ?? {} });
        toast('Đã gửi tín hiệu thiết bị giả lập', 'success');
        onDone?.();
      } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
    }}>{label}</button>
  );
}

export type Behavior = 'SUCCESS' | 'FAIL' | 'LOST_RESPONSE' | 'TIMEOUT';
export const behaviorLabel: Record<Behavior, string> = {
  SUCCESS: 'Thành công', FAIL: 'Thiết bị báo lỗi', LOST_RESPONSE: 'Đã thực hiện nhưng mất phản hồi', TIMEOUT: 'Không phản hồi',
};
export function NextOutcome({ deviceType, deviceId, onChange }: { deviceType: 'VEHICLE' | 'PORT' | 'SLOT'; deviceId: number | null | undefined; onChange?: (b: Behavior) => void }) {
  const toast = useToast();
  const [value, setValue] = useState<Behavior>('SUCCESS');
  return (
    <div className="row" style={{ gap: 6 }}>
      <span className="small muted">Kết quả lệnh kế tiếp:</span>
      <select className="select" style={{ width: 'auto', padding: '6px 10px' }} value={value} disabled={!deviceId}
        onChange={async (e) => {
          const b = e.target.value as Behavior;
          setValue(b);
          if (!deviceId) return;
          try {
            await api(`/api/v1/sim/devices/${deviceType}/${deviceId}/next`, { body: { behavior: b } });
            onChange?.(b);
          } catch (err) { toast(errorText(err), 'error'); }
        }}>
        {(Object.keys(behaviorLabel) as Behavior[]).map((b) => <option key={b} value={b}>{behaviorLabel[b]}</option>)}
      </select>
    </div>
  );
}
