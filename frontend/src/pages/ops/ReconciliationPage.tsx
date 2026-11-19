import { api } from '../../api/client';
import type { CommandRow, ReturnResult, TripView } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { Empty, Loading, Pill, errorText, useToast } from '../../components/ui';
import { ago, shortDateTime } from '../../lib/format';
import { useLoad } from '../../lib/hooks';

/** §2.3 – Đối soát lệnh thiết bị có kết quả không xác định (góp ý #5) và chuyến trả xe ngoại tuyến chờ bằng chứng vật lý (góp ý #6). */
export function ReconciliationPage() {
  const toast = useToast();
  const { data, reload } = useLoad(() => api<{ commands: CommandRow[]; pendingTrips: TripView[] }>('/api/v1/ops/reconciliation'), [], 15000);
  if (!data) return <Loading />;
  const resolve = async (c: CommandRow, success: boolean) => {
    try { await api(`/api/v1/ops/reconciliation/commands/${c.id}/resolve`, { body: { success } }); toast('Đã ghi nhận kết quả đối soát', 'success'); reload(); } catch (e) { toast(errorText(e), 'error'); }
  };
  const confirmTrip = async (id: number) => {
    try { const r = await api<ReturnResult>(`/api/v1/ops/reconciliation/trips/${id}/confirm`, { body: {} }); toast(r.message, 'success'); reload(); } catch (e) { toast(errorText(e), 'error'); }
  };
  return (
    <div className="page">
      <PageHead title="Đối soát thiết bị" sub="Lệnh gửi thiết bị bị mất phản hồi / quá thời gian được giữ ở trạng thái chờ đối soát – không tự coi là thành công hay thất bại" />
      <div className="grid side-wide">
        <div className="card">
          <h3 className="mb-8">Lệnh chờ đối soát ({data.commands.length})</h3>
          {data.commands.length === 0 ? <Empty icon="✅" title="Không có lệnh cần đối soát" /> : (
            <div className="table-wrap"><table className="table compact">
              <thead><tr><th>#</th><th>Thiết bị</th><th>Lệnh</th><th>Ngữ cảnh</th><th>Gửi lúc</th><th>Lần thử</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>{data.commands.map((c) => (
                <tr key={c.id}><td className="mono">{c.id}</td><td>{c.deviceType} #{c.deviceId}</td><td className="mono small">{c.command}</td><td className="small">{c.contextType} #{c.contextId}</td>
                  <td className="small">{shortDateTime(c.requestedAt)}<div className="tiny muted">{ago(c.requestedAt)}</div></td><td>{c.attempts}</td><td><Pill status={c.status} />{c.detail && <div className="tiny muted">{c.detail}</div>}</td>
                  <td>{c.command === 'UNLOCK' && c.contextType === 'PICKUP' && <div className="row" style={{ gap: 6 }}><button className="btn sm success" onClick={() => resolve(c, true)}>Xe đã mở</button><button className="btn sm danger-soft" onClick={() => resolve(c, false)}>Không mở</button></div>}</td></tr>))}</tbody>
            </table></div>
          )}
          <div className="hint mt-12">Hệ thống tự truy vấn lại trạng thái khóa định kỳ; nút xác nhận thủ công chỉ dùng sau khi kiểm tra thực địa.</div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 className="mb-8">Chuyến trả xe chờ xác nhận ({data.pendingTrips.length})</h3>
          {data.pendingTrips.length === 0 ? <Empty icon="🛵" title="Không có chuyến chờ" /> : data.pendingTrips.map((t) => <PendingTrip key={t.id} t={t} onConfirm={() => confirmTrip(t.id)} />)}
          <div className="banner info small mt-12">Trả xe ngoại tuyến bằng OTP chỉ xác thực người dùng. Chuyến chỉ hoàn tất khi có bằng chứng vật lý (cảm biến ô đỗ + khóa) hoặc nhân viên xác nhận tại chỗ.</div>
        </div>
      </div>
    </div>
  );
}

function PendingTrip({ t, onConfirm }: { t: TripView; onConfirm: () => void }) {
  return (
    <div className="list-item" style={{ cursor: 'default' }}>
      <div style={{ flex: 1 }}><b className="mono small">{t.code}</b> <Pill status={t.status} />
        <div className="tiny muted">{t.vehicleCode} · {t.endHubName ?? t.startHubName}{t.endSlotCode ? ` · ô ${t.endSlotCode}` : ''}{t.reconciliationNote ? ` · ${t.reconciliationNote}` : ''}</div></div>
      <button className="btn sm" onClick={onConfirm}>Xác nhận tại chỗ</button>
    </div>
  );
}
