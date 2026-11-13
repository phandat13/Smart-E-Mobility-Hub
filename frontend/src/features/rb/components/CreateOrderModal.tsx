import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { type TransferVehicle, type HubInfo, type DriverTeam, type CreateTransferRequest } from '../types';
import { createTransferOrderApi, getHubsForTransferApi, getVehiclesAtHubApi, getDriverTeamsApi } from '../api/transferApi';
import '../rb.css';
import { CloseIcon } from '../../../components/icons';

export interface CreateOrderPrefill {
  sourceHubId?: number;
  targetHubId?: number;
  vehicleCount?: number;
  alertId?: number;
  detectedAt?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** tone: 'ok' khi 201 (đã giao tài xế), 'warn' khi 202 (vào hàng chờ). */
  onSuccess: (message: string, tone: 'ok' | 'warn') => void;
  prefill?: CreateOrderPrefill | null;
}

const clock = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '';

export default function CreateOrderModal({ isOpen, onClose, onSuccess, prefill }: Props) {
  const [sourceHubId, setSourceHubId] = useState<number | ''>('');
  const [targetHubId, setTargetHubId] = useState<number | ''>('');
  const [vehicleCount, setVehicleCount] = useState(1);
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [teamId, setTeamId] = useState<number | ''>('');
  const [note, setNote] = useState('');

  const [hubs, setHubs] = useState<HubInfo[]>([]);
  const [vehicles, setVehicles] = useState<TransferVehicle[]>([]);
  const [teams, setTeams] = useState<DriverTeam[]>([]);

  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mỗi lần mở modal: nạp lại danh mục và điền sẵn theo đề xuất (nếu có).
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSourceHubId(prefill?.sourceHubId ?? '');
    setTargetHubId(prefill?.targetHubId ?? '');
    setVehicleCount(prefill?.vehicleCount ?? 1);
    setPickedIds([]);
    setTeamId('');
    setNote('');
    getHubsForTransferApi().then((d) => setHubs(d.map((h) => ({ ...h, code: `HUB-${h.id}` })))).catch(() => setHubs([]));
    getDriverTeamsApi().then(setTeams).catch(() => setTeams([]));
  }, [isOpen, prefill]);

  const loadVehicles = useCallback(async (hubId: number, count: number) => {
    setLoadingVehicles(true);
    try {
      const data = (await getVehiclesAtHubApi(hubId)).map((v) => ({ ...v, status: v.status as TransferVehicle['status'] }));
      const ready = data.filter((v) => v.status === 'AVAILABLE').sort((a, b) => b.batteryPercent - a.batteryPercent);
      setVehicles(ready);
      setPickedIds(ready.slice(0, count).map((v) => v.id));
    } catch {
      setVehicles([]);
      setPickedIds([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && sourceHubId) void loadVehicles(Number(sourceHubId), vehicleCount);
    if (!sourceHubId) {
      setVehicles([]);
      setPickedIds([]);
    }
    // vehicleCount chỉ dùng làm giá trị khởi tạo lựa chọn khi đổi Hub nguồn; đổi số lượng xử lý ở changeCount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sourceHubId, loadVehicles]);

  const changeCount = (raw: number) => {
    const n = Math.max(1, Math.min(raw || 1, vehicles.length || raw || 1));
    setVehicleCount(n);
    setPickedIds(vehicles.slice(0, n).map((v) => v.id));
  };

  const toggle = (id: number) => setPickedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!sourceHubId) return setError('Vui lòng chọn Hub nguồn');
    if (!targetHubId) return setError('Vui lòng chọn Hub đích');
    if (sourceHubId === targetHubId) return setError('Hub nguồn và Hub đích không được trùng nhau');
    if (pickedIds.length === 0) return setError('Vui lòng chọn ít nhất 1 xe');

    setSubmitting(true);
    try {
      const body: CreateTransferRequest = {
        sourceHubId: Number(sourceHubId),
        targetHubId: Number(targetHubId),
        vehicleIds: pickedIds,
        alertId: prefill?.alertId,
        teamId: teamId ? Number(teamId) : undefined,
        note: note.trim() || undefined,
      };
      const res = await createTransferOrderApi(body);
      onSuccess(res.message || (res.status === 201 ? 'Đã giao lệnh cho tài xế' : 'Lệnh đã vào hàng chờ'), res.status === 201 ? 'ok' : 'warn');
      onClose();
    } catch (err: unknown) {
      const { code, message } = err as { code?: string; message?: string };
      if (code === 'HUB_FULL') setError(message || 'Hub đích không đủ chỗ trống');
      else if (code === 'VEHICLE_UNAVAILABLE') {
        setError(message || 'Một số xe không còn sẵn sàng, vui lòng chọn lại');
        void loadVehicles(Number(sourceHubId), pickedIds.length);
      } else if (code === 'VEHICLE_HAS_OPERATION') setError(message || 'Có xe đang có hoạt động khác');
      else setError(message || 'Tạo lệnh thất bại, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hubLabel = (h: HubInfo) => (h.detail ? `${h.name} · ${h.detail}` : h.name);
  const bar = (p: number) => <span className="rebalance__bar" aria-hidden="true"><span style={{ width: `${p}%` }} /></span>;

  return (
    <div className="rebalance__overlay" role="dialog" aria-modal="true" aria-labelledby="rebalance__create-title" onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <form className="rebalance__modal" onSubmit={submit} noValidate>
        <div className="rebalance__modal-head">
          <div>
            <h2 id="rebalance__create-title" className="rebalance__modal-title">Tạo lệnh điều chuyển xe</h2>
            <p className="rebalance__modal-sub">
              {prefill?.alertId ? `Từ cảnh báo mất cân đối${prefill.detectedAt ? ` · phát hiện ${clock(prefill.detectedAt)}` : ''}` : 'Tạo lệnh thủ công'}
            </p>
          </div>
          <button type="button" className="rebalance__x" onClick={onClose} aria-label="Đóng"><CloseIcon size={14} /></button>
        </div>

        {error && <div className="rebalance__error" role="alert">{error}</div>}

        <div className="rebalance__grid2">
          <div className="rebalance__field">
            <label className="rebalance__label" htmlFor="rebalance__src">Hub nguồn</label>
            <select id="rebalance__src" className="rebalance__select" value={sourceHubId} onChange={(e) => setSourceHubId(e.target.value ? Number(e.target.value) : '')} disabled={submitting}>
              <option value="">Chọn Hub nguồn</option>
              {hubs.map((h) => <option key={h.id} value={h.id}>{hubLabel(h)}</option>)}
            </select>
          </div>
          <div className="rebalance__field">
            <label className="rebalance__label" htmlFor="rebalance__dst">Hub đích</label>
            <select id="rebalance__dst" className="rebalance__select" value={targetHubId} onChange={(e) => setTargetHubId(e.target.value ? Number(e.target.value) : '')} disabled={submitting}>
              <option value="">Chọn Hub đích</option>
              {hubs.filter((h) => h.id !== sourceHubId).map((h) => <option key={h.id} value={h.id}>{hubLabel(h)}</option>)}
            </select>
          </div>
        </div>

        <div className="rebalance__grid2 rebalance__grid2--wide-right">
          <div className="rebalance__field">
            <label className="rebalance__label" htmlFor="rebalance__count">Số lượng xe</label>
            <input id="rebalance__count" className="rebalance__input" type="number" min={1} max={vehicles.length || undefined} value={vehicleCount} onChange={(e) => changeCount(Number(e.target.value))} disabled={submitting} />
          </div>
          <div className="rebalance__field">
            <label className="rebalance__label" htmlFor="rebalance__team">Đội vận chuyển</label>
            <select id="rebalance__team" className="rebalance__select" value={teamId} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : '')} disabled={submitting}>
              <option value="">Tự động phân công (khuyến nghị)</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="rebalance__pick-head">
          <div>
            <div className="rebalance__pick-title">Chọn xe cần điều chuyển</div>
            <div className="rebalance__pick-hint">Sắp xếp theo mức pin từ cao đến thấp · chỉ hiển thị xe "Sẵn sàng"</div>
          </div>
          <span className="rebalance__pill rebalance__pill--blue">Đã chọn {pickedIds.length} / {vehicleCount}</span>
        </div>

        <div className="rebalance__table-wrap">
          <table className="rebalance__table">
            <thead>
              <tr><th className="rebalance__col-check" /><th>Mã xe</th><th>Loại</th><th>Mức pin</th><th>Vị trí</th></tr>
            </thead>
            <tbody>
              {loadingVehicles ? (
                <tr><td colSpan={5} className="rebalance__col-empty">Đang tải danh sách xe…</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={5} className="rebalance__col-empty">{sourceHubId ? 'Không có xe sẵn sàng tại Hub này' : 'Chọn Hub nguồn để xem xe sẵn sàng'}</td></tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className={pickedIds.includes(v.id) ? 'is-picked' : ''}>
                    <td><input type="checkbox" checked={pickedIds.includes(v.id)} onChange={() => toggle(v.id)} disabled={submitting} aria-label={`Chọn ${v.code}`} /></td>
                    <td><strong>{v.code}</strong></td>
                    <td>{v.type}</td>
                    <td><div className="rebalance__battery">{bar(v.batteryPercent)}<span>{v.batteryPercent}%</span></div></td>
                    <td>{v.location}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rebalance__field">
          <label className="rebalance__label" htmlFor="rebalance__note">Ghi chú</label>
          <textarea id="rebalance__note" className="rebalance__textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú thêm cho lệnh (không bắt buộc)" disabled={submitting} />
        </div>

        <div className="rebalance__note">
          Khi xác nhận, hệ thống kiểm tra lần cuối các xe vẫn "Sẵn sàng" và chuyển sang "Khóa điều chuyển" trong cùng một giao dịch; nếu có xe vừa bị đặt/thuê, toàn bộ lệnh bị hủy để chọn lại.
        </div>

        <div className="rebalance__actions">
          <button type="button" className="rebalance__btn rebalance__btn--ghost" onClick={onClose} disabled={submitting}>Hủy bỏ</button>
          <button type="submit" className="rebalance__btn" disabled={submitting || pickedIds.length === 0}>{submitting ? 'Đang tạo lệnh…' : 'Xác nhận phát lệnh'}</button>
        </div>
      </form>
    </div>
  );
}
