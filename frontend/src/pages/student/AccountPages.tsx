import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, HttpError } from '../../api/client';
import type { HubDetail, PersonalVehicleView, ProfileView, ReportResult, SearchResult } from '../../api/types';
import { PageHead } from '../../components/Layouts';
import { ConfirmModal, Empty, Field, KV, Loading, Pill, Spinner, errorText, useToast } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useLoad } from '../../lib/hooks';

/** AC04 – Chỉnh sửa thông tin tài khoản sinh viên. */
export function AccountPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, setData } = useLoad(() => api<ProfileView>('/api/v1/me/profile'));
  const [f, setF] = useState({ fullName: '', phone: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF({ fullName: data.fullName, phone: data.phone, address: data.address ?? '' }); }, [data]);
  if (!data) return <Loading />;

  const save = async () => {
    const er: Record<string, string> = {};
    if (!f.fullName.trim()) er.fullName = 'Bắt buộc';
    if (!/^0\d{9}$/.test(f.phone)) er.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { setData(await api<ProfileView>('/api/v1/me/profile', { method: 'PUT', body: f })); toast('Cập nhật hồ sơ thành công', 'success'); }
    catch (e) { if (e instanceof HttpError) setErrors(e.fields); toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const changePw = async () => {
    if (pw.newPassword !== pw.confirm) { setErrors({ confirm: 'Mật khẩu nhập lại không khớp' }); return; }
    setBusy(true);
    try { await api('/api/v1/me/password', { method: 'PUT', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } }); toast('Đổi mật khẩu thành công', 'success'); setPw({ currentPassword: '', newPassword: '', confirm: '' }); }
    catch (e) { if (e instanceof HttpError) setErrors(e.fields); toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="page medium">
      <div className="grid" style={{ gridTemplateColumns: '260px minmax(0,1fr)' }}>
        <div className="card center" style={{ alignSelf: 'start' }}>
          <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, margin: '0 auto' }}>{user?.fullName.split(' ').slice(-1)[0]?.[0]}</div>
          <h3 className="mt-12">{data.fullName}</h3>
          <div className="small muted">MSSV {data.studentCode} · {data.school}</div>
          <div className="mt-8">{data.verified ? <Pill tone="green" label="Đã xác thực" /> : <Pill tone="orange" label="Chờ xác thực" />}</div>
          <div className="col mt-16" style={{ textAlign: 'left' }}>
            <Link className="btn ghost" to="/vehicles">🚘 Phương tiện cá nhân</Link>
            <Link className="btn ghost" to="/trips">🧾 Lịch sử chuyến đi</Link>
            <Link className="btn ghost" to="/report">⚠ Báo cáo sự cố</Link>
          </div>
        </div>
        <div className="col">
          <div className="card pad-lg">
            <div className="row between"><h2>Hồ sơ cá nhân</h2><Pill tone="blue" label="Đang chỉnh sửa" /></div>
            <p className="sub mb-16">Cập nhật thông tin liên hệ hoặc thay đổi mật khẩu tài khoản.</p>
            <div className="grid cols-2" style={{ gap: '0 16px' }}>
              <Field label="Họ và tên" error={errors.fullName}><input className={`input ${errors.fullName ? 'error' : ''}`} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
              <Field label="Mã số sinh viên (không thể thay đổi)"><input className="input" value={data.studentCode} disabled /></Field>
              <Field label="Email sinh viên"><input className="input" value={data.email} disabled /></Field>
              <Field label="Số điện thoại" error={errors.phone}><input className={`input ${errors.phone ? 'error' : ''}`} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
              <Field label="Biệt danh / Tên đăng nhập"><input className="input" value={data.username} disabled /></Field>
              <Field label="Địa chỉ cư trú"><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            </div>
            <div className="row"><span className="spacer" /><button className="btn ghost" onClick={() => setF({ fullName: data.fullName, phone: data.phone, address: data.address ?? '' })}>Hủy</button><button className="btn" disabled={busy} onClick={save}>{busy ? <Spinner /> : 'Lưu thay đổi'}</button></div>
          </div>
          <div className="card pad-lg">
            <h3>Đổi mật khẩu</h3>
            <div className="grid cols-3 mt-12" style={{ gap: '0 12px' }}>
              <Field label="Mật khẩu hiện tại" error={errors.currentPassword}><input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
              <Field label="Mật khẩu mới" error={errors.newPassword}><input className="input" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
              <Field label="Nhập lại mật khẩu mới" error={errors.confirm}><input className={`input ${errors.confirm ? 'error' : ''}`} type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            </div>
            <div className="row"><span className="hint">Hệ thống gửi thông báo xác nhận sau khi cập nhật.</span><span className="spacer" /><button className="btn" disabled={busy || !pw.currentPassword || pw.newPassword.length < 6} onClick={changePw}>Đổi mật khẩu</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_PV = { plateNumber: '', type: 'E_SCOOTER', model: '', batteryKwh: 3.5, connectorType: 'TYPE_2' };

/** PV02 – Quản lý phương tiện cá nhân. */
export function MyVehiclesPage() {
  const toast = useToast();
  const { data, reload } = useLoad(() => api<PersonalVehicleView[]>('/api/v1/me/vehicles'));
  const [f, setF] = useState(EMPTY_PV);
  const [editing, setEditing] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [del, setDel] = useState<PersonalVehicleView | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api(editing ? `/api/v1/me/vehicles/${editing}` : '/api/v1/me/vehicles', { method: editing ? 'PUT' : 'POST', body: f });
      toast(editing ? 'Đã cập nhật phương tiện' : 'Đã thêm phương tiện', 'success');
      setF(EMPTY_PV); setEditing(null); reload();
    } catch (e) { if (e instanceof HttpError) setErrors(e.fields); toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="page">
      <PageHead eyebrow="PV02" title="Phương tiện của tôi" sub="Thông tin xe dùng để kiểm tra tương thích khi đặt chỗ đỗ và sạc" />
      <div className="grid side-wide">
        <div className="card">
          {!data ? <Loading /> : data.length === 0 ? <Empty icon="🚘" title="Chưa có phương tiện" /> : data.map((v) => (
            <div key={v.id} className="list-item" style={{ cursor: 'default' }}>
              <div className="vehicle-ico">{v.type === 'E_BIKE' ? '🚲' : '🛵'}</div>
              <div style={{ flex: 1 }}><b>{v.model ?? v.type}</b> <span className="mono small">· {v.plateNumber}</span>
                <div className="small muted">Pin {v.batteryKwh} kWh · Chuẩn sạc {v.connectorType}</div>
                {v.hasActiveBooking && <Pill tone="blue" label="Đang có lịch đặt chỗ" />}</div>
              <button className="btn sm ghost" onClick={() => { setEditing(v.id); setF({ plateNumber: v.plateNumber, type: v.type, model: v.model ?? '', batteryKwh: v.batteryKwh, connectorType: v.connectorType }); }}>Sửa</button>
              <button className="btn sm danger-soft" onClick={() => setDel(v)}>Xóa</button>
            </div>
          ))}
          <div className="banner warn small mt-12">Không thể xóa phương tiện đang có lịch đặt chỗ đỗ/sạc hoặc đang sạc tại Hub.</div>
        </div>
        <div className="card">
          <h3>{editing ? 'Sửa phương tiện' : 'Thêm phương tiện mới'}</h3>
          <div className="mt-12">
            <Field label="Biển số xe" error={errors.plateNumber}><input className={`input ${errors.plateNumber ? 'error' : ''}`} value={f.plateNumber} onChange={(e) => setF({ ...f, plateNumber: e.target.value })} placeholder="59-X1 678.90" /></Field>
            <Field label="Loại xe"><select className="select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="E_SCOOTER">Xe máy điện</option><option value="E_BIKE">Xe đạp điện</option><option value="E_MOTORBIKE">Mô tô điện</option></select></Field>
            <Field label="Hãng / mẫu xe"><input className="input" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} placeholder="Yadea Xmen" /></Field>
            <div className="grid cols-2" style={{ gap: '0 12px' }}>
              <Field label="Dung lượng pin (kWh)" error={errors.batteryKwh}><input className="input" type="number" step="0.1" value={f.batteryKwh} onChange={(e) => setF({ ...f, batteryKwh: Number(e.target.value) })} /></Field>
              <Field label="Chuẩn cắm sạc"><select className="select" value={f.connectorType} onChange={(e) => setF({ ...f, connectorType: e.target.value })}>{['TYPE_2', 'CCS2', 'J1772', 'STD_220V'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <div className="row"><button className="btn ghost block" onClick={() => { setF(EMPTY_PV); setEditing(null); }}>Hủy</button><button className="btn block" disabled={busy} onClick={save}>{busy ? <Spinner /> : 'Lưu phương tiện'}</button></div>
          </div>
        </div>
      </div>
      <ConfirmModal open={!!del} danger tone="red" icon="🗑" title={`Xóa ${del?.plateNumber}?`} body="Phương tiện sẽ bị gỡ khỏi tài khoản." busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { setBusy(true); try { await api(`/api/v1/me/vehicles/${del!.id}`, { method: 'DELETE' }); toast('Đã xóa', 'success'); reload(); } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); setDel(null); } }} />
    </div>
  );
}

const CATEGORIES = { VEHICLE: ['Hư hỏng phanh / kẹt xích', 'Pin sụt nhanh bất thường', 'Khóa xe không hoạt động', 'Lốp xẹp / hư hỏng thân xe', 'Khác'], CHARGING_PORT: ['Cổng không sạc', 'Đầu cắm hư hỏng', 'Màn hình trụ sạc lỗi', 'Khác'], PARKING_SLOT: ['Ô đỗ bị chiếm dụng', 'Cảm biến ô đỗ lỗi', 'Khác'] };

/** MT01 – Báo cáo sự cố hạ tầng và phương tiện (sinh viên). */
export function ReportIncidentPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const hubs = useLoad(() => api<SearchResult>('/api/v1/hubs'));
  const [hubId, setHubId] = useState<number | null>(sp.get('hub') ? Number(sp.get('hub')) : null);
  const [type, setType] = useState<'VEHICLE' | 'CHARGING_PORT' | 'PARKING_SLOT'>('VEHICLE');
  const [code, setCode] = useState(sp.get('vehicle') ?? '');
  const [category, setCategory] = useState(CATEGORIES.VEHICLE[0]);
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<ReportResult | null>(null);
  const detail = useLoad(() => (hubId ? api<HubDetail>(`/api/v1/hubs/${hubId}`) : Promise.resolve(null)), [hubId]);
  useEffect(() => { if (!hubId && hubs.data?.items.length) setHubId(hubs.data.items[0].id); }, [hubs.data, hubId]);
  useEffect(() => { setCategory(CATEGORIES[type][0]); }, [type]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      setDone(await api<ReportResult>('/api/v1/incidents', { body: { hubId, targetType: type, targetCode: code, category, description: desc, photoUrls: photos, tripId: sp.get('trip') ? Number(sp.get('trip')) : null } }));
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  if (done) return (
    <div className="page narrow"><div className="card pad-lg center">
      <div className="modal-icon green">✓</div><h1>{done.duplicated ? 'Sự cố đã được ghi nhận trước đó' : 'Đã tiếp nhận báo cáo sự cố'}</h1>
      <p className="muted mt-8">{done.message}</p>
      <div className="stat-tile mt-16" style={{ display: 'inline-block' }}><div className="label">Mã phiếu sự cố</div><div className="value mono">#{done.code}</div></div>
      <div className="mt-16" style={{ textAlign: 'left' }}><KV k="Đối tượng" v={done.targetLabel} /><KV k="Trạng thái xử lý" v={<Pill status={done.status} />} /></div>
      <div className="banner info small mt-16" style={{ textAlign: 'left' }}>Phương tiện/thiết bị đã được gắn cờ tạm thời để không phân bổ cho người khác trong lúc chờ xử lý.</div>
      <button className="btn block mt-16" onClick={() => nav('/')}>Về trang chủ</button></div></div>
  );
  return (
    <div className="page narrow">
      <div className="card pad-lg">
        <div className="row"><div className="modal-icon red" style={{ margin: 0, width: 44, height: 44, fontSize: 20 }}>⚠️</div><div><h1>Báo cáo sự cố</h1><p className="sub">Phản ánh hỏng hóc của phương tiện hoặc thiết bị tại Hub</p></div></div>
        <div className="grid cols-2 mt-16" style={{ gap: '0 16px' }}>
          <Field label="Hub xảy ra sự cố"><select className="select" value={hubId ?? ''} onChange={(e) => setHubId(Number(e.target.value))}>{hubs.data?.items.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
          <Field label="Đối tượng gặp lỗi"><div className="seg">{([['VEHICLE', 'Phương tiện'], ['CHARGING_PORT', 'Cổng sạc'], ['PARKING_SLOT', 'Ô đỗ']] as const).map(([k, l]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}</div></Field>
        </div>
        <Field label={type === 'VEHICLE' ? 'Mã phương tiện' : type === 'CHARGING_PORT' ? 'Mã cổng sạc' : 'Mã ô đỗ'}>
          {type === 'VEHICLE' ? <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="UG-018" list="veh-list" /> : <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder={type === 'CHARGING_PORT' ? 'C-03' : 'S-12'} />}
          <datalist id="veh-list">{detail.data?.vehicles.map((v) => <option key={v.id} value={v.code} />)}</datalist>
        </Field>
        <Field label="Loại lỗi"><div className="grid cols-2" style={{ gap: 8 }}>{CATEGORIES[type].map((c) => <label key={c} className="checkbox"><input type="radio" checked={category === c} onChange={() => setCategory(c)} /> {c}</label>)}</div></Field>
        <Field label="Mô tả chi tiết"><textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mô tả hiện tượng, thời điểm, vị trí…" /></Field>
        <Field label="Ảnh hiện trường (tối đa 3)"><div className="row">{photos.map((_, i) => <div key={i} className="slot free" style={{ width: 64 }}>🖼️</div>)}{photos.length < 3 && <button className="btn ghost" onClick={() => setPhotos([...photos, `incident-${Date.now()}.jpg`])}>+ Thêm ảnh</button>}</div></Field>
        {error && <div className="banner error mb-12">{error}</div>}
        <button className="btn danger lg block" disabled={busy || !code || !desc} onClick={submit}>{busy ? <Spinner /> : 'Gửi báo cáo sự cố'}</button>
      </div>
    </div>
  );
}
