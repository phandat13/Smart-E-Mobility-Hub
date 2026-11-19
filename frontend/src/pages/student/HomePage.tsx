import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, HttpError } from '../../api/client';
import type { ActiveState, AlternativeView, HubDetail, HubSummary, ReservationView, SearchResult } from '../../api/types';
import { HubMap } from '../../components/HubMap';
import { Battery, Empty, Loading, Modal, Pill, Spinner, Updated, errorText, useToast } from '../../components/ui';
import { hubTypeLabel, vehicleTypeLabel } from '../../lib/format';
import { useLoad } from '../../lib/hooks';
import { subscribe } from '../../lib/realtime';

/** AC01 – Tìm kiếm & tra cứu tài nguyên Hub (dữ liệu kèm thời điểm cập nhật, làm mới 30 giây + realtime). */
export function HomePage() {
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('Tất cả');
  const [selected, setSelected] = useState<number | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [alts, setAlts] = useState<{ msg: string; items: AlternativeView[] } | null>(null);

  const search = useLoad(() => api<SearchResult>(`/api/v1/hubs?q=${encodeURIComponent(query)}&area=${encodeURIComponent(area)}`), [query, area], 30000);
  const all = useLoad(() => api<SearchResult>('/api/v1/hubs'), [], 60000);
  const active = useLoad(() => api<ActiveState>('/api/v1/trips/active'), [], 30000);
  const detail = useLoad(() => (selected ? api<HubDetail>(`/api/v1/hubs/${selected}`) : Promise.resolve(null)), [selected], 30000);

  const items = search.data?.items ?? [];
  useEffect(() => {
    if (!selected && items.length) setSelected(items[0].id);
  }, [items, selected]);

  // Đẩy realtime: số liệu Hub đổi → cập nhật ngay
  useEffect(() => {
    if (!selected) return;
    return subscribe(`/topic/hubs/${selected}`, (b) => {
      const s = b as HubSummary;
      detail.setData((d) => (d ? { ...d, hub: { ...d.hub, ...s } } : d));
      detail.reload();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const areas = useMemo(() => ['Tất cả', ...Array.from(new Set((all.data?.items ?? []).map((h) => h.area).filter(Boolean) as string[]))], [all.data]);
  const mapHubs = useMemo(() => (all.data?.items ?? []).map((h) => ({ id: h.id, name: h.name, latitude: h.latitude, longitude: h.longitude, label: `${h.name} · ${h.availableVehicles} xe`, muted: h.availableVehicles === 0 })), [all.data]);
  const onSelect = useCallback((id: number) => { setSelected(id); setVehicleId(null); }, []);

  const hub = detail.data?.hub;
  const vehicles = detail.data?.vehicles ?? [];
  const chosen = vehicles.find((v) => v.id === vehicleId) ?? vehicles.find((v) => v.status === 'AVAILABLE' && v.batteryPercent >= 20);

  const reserve = async (id: number) => {
    setBusy(true);
    try {
      const r = await api<ReservationView>('/api/v1/reservations', { body: { vehicleId: id, hubId: hub?.id } });
      toast(r.message ?? 'Đặt xe thành công', 'success');
      nav(`/reservations/${r.id}`);
    } catch (e) {
      if (e instanceof HttpError && (e.code === 'VEHICLE_UNAVAILABLE' || e.code === 'LOW_BATTERY')) {
        setAlts({ msg: e.message, items: e.detail<AlternativeView[]>('alternatives') ?? [] });
        detail.reload();
      } else toast(errorText(e), 'error');
    } finally { setBusy(false); }
  };

  const act = active.data;
  return (
    <div className="page">
      {act?.reservation && (
        <div className="banner info mb-16 row">⏱ Bạn đang có đơn <b>{act.reservation.code}</b> ({act.reservation.vehicleCode} tại {act.reservation.hubName}).
          <span className="spacer" /><Link to={`/reservations/${act.reservation.id}`}>Xem đơn →</Link></div>
      )}
      {act?.trip && (
        <div className="banner success mb-16 row">🛵 Chuyến đi <b>{act.trip.code}</b> đang {act.trip.status === 'PENDING_RECONCILIATION' ? 'chờ đối soát' : 'diễn ra'}.
          <span className="spacer" /><Link to={`/trips/${act.trip.id}/live`}>Mở chuyến đi →</Link></div>
      )}
      <div className="grid side" style={{ gridTemplateColumns: 'minmax(0,1fr) 400px' }}>
        <div className="col">
          <form className="row" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setSelected(null); }}>
            <div className="search" style={{ maxWidth: 'none', flex: 1 }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập tên Hub, vd: KTX Khu A" /></div>
            <select className="select" style={{ width: 170 }} value={area} onChange={(e) => { setArea(e.target.value); setSelected(null); }}>
              {areas.map((a) => <option key={a}>{a === 'Tất cả' ? 'Khu vực: Tất cả' : a}</option>)}
            </select>
            <button className="btn">Tìm kiếm</button>
            <button type="button" className="btn ghost" onClick={() => { search.reload(); detail.reload(); all.reload(); }}>⟳ Làm mới</button>
          </form>
          <HubMap hubs={mapHubs} selectedId={selected} onSelect={onSelect} height={470} />
          <div className="card flat" style={{ padding: 14 }}>
            <div className="row between mb-8">
              <b>Kết quả tìm kiếm · {items.length} Hub</b>
              <Updated at={search.data?.servedAt} refreshSeconds={search.data?.refreshSeconds} />
            </div>
            {search.loading && !search.data ? <Loading /> : items.length === 0 ? (
              <div>
                <div className="banner warn">Không tìm thấy Hub phù hợp.</div>
                {(search.data?.suggestions.length ?? 0) > 0 && <div className="mt-12 small muted">Gợi ý Hub khả dụng gần nhất:</div>}
                <div className="row wrap mt-8">{search.data?.suggestions.map((h) => <button key={h.id} className="chip" onClick={() => { setQ(''); setQuery(''); setSelected(h.id); }}>{h.name} · {h.availableVehicles} xe</button>)}</div>
              </div>
            ) : (
              <div className="grid cols-4" style={{ gap: 8 }}>
                {items.map((h) => (
                  <button key={h.id} className={`choice ${h.id === selected ? 'on' : ''}`} onClick={() => onSelect(h.id)}>
                    <div className="t">{h.name}</div>
                    <div className="d">{h.availableVehicles} xe · {h.freeSharedSlots} chỗ · {h.freePorts} cổng</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 76 }}>
          {!hub ? <Loading /> : (
            <>
              <div className="row between">
                <span className="eyebrow" style={{ margin: 0 }}>Thông tin Hub</span>
                <Pill status={hub.status} />
              </div>
              <h2 className="mt-8">{hub.name}</h2>
              <div className="sub">{hub.address} · {hubTypeLabel[hub.type] ?? hub.type}</div>
              <div className="mt-8"><Updated at={hub.dataUpdatedAt} stale={hub.stale} /></div>
              {hub.stale && <div className="banner warn small mt-8">Hub chưa gửi dữ liệu gần đây – số liệu có thể không chính xác. Mọi thao tác vẫn được kiểm tra lại khi xác nhận.</div>}
              <div className="grid cols-2 mt-12" style={{ gap: 10 }}>
                <div className="stat-tile"><div className="label">Xe sẵn sàng</div><div className="value">{hub.availableVehicles} xe</div></div>
                <div className="stat-tile"><div className="label">Pin trung bình</div><div className="value">{hub.avgBattery ?? '—'}%</div></div>
                <div className="stat-tile"><div className="label">Chỗ đỗ trống</div><div className="value">{hub.freeSharedSlots} / {hub.sharedCapacity}</div></div>
                <div className="stat-tile"><div className="label">Cổng sạc trống</div><div className="value">{hub.freePorts} / {hub.totalPorts}</div></div>
              </div>
              <div className="row between mt-16 mb-8"><b>Phương tiện tại Hub</b><span className="small muted">Sắp xếp: Pin ↓</span></div>
              <div style={{ maxHeight: 290, overflowY: 'auto', paddingRight: 2 }}>
                {vehicles.length === 0 && <Empty icon="🛵" title="Hub hiện không có xe" />}
                {vehicles.map((v) => {
                  const selectable = v.status === 'AVAILABLE' && v.batteryPercent >= 20;
                  return (
                    <div key={v.id} className={`list-item ${chosen?.id === v.id ? 'on' : ''}`} style={{ cursor: selectable ? 'pointer' : 'default', opacity: selectable ? 1 : .75 }}
                      onClick={() => selectable && setVehicleId(v.id)}>
                      <div className="vehicle-ico">🛵</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row between"><b>{v.code}</b><Pill status={v.status === 'AVAILABLE' && v.batteryPercent < 20 ? 'NEEDS_CHARGE' : v.status} /></div>
                        <div className="small muted">{vehicleTypeLabel(v.type)} · ~{Math.round(v.rangeKm)} km</div>
                        <Battery value={v.batteryPercent} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="btn lg block mt-16" disabled={!chosen || busy || !!act?.reservation || !!act?.trip} onClick={() => chosen && reserve(chosen.id)}>
                {busy ? <Spinner /> : chosen ? `Đặt trước ${chosen.code} (giữ chỗ 15 phút)` : 'Không có xe khả dụng'}
              </button>
              <button className="btn ghost block mt-8" onClick={() => nav('/pickup')} disabled={!!act?.trip}>📷 Nhận xe ngay – quét mã QR trên xe</button>
              <p className="tiny muted mt-8">Trạng thái xe được kiểm tra lại tại thời điểm bạn xác nhận đặt.</p>
            </>
          )}
        </div>
      </div>

      <Modal open={!!alts} onClose={() => setAlts(null)}>
        <div className="modal-icon red">⚠️</div>
        <h2 className="center">Phương tiện không còn khả dụng</h2>
        <p className="center muted mt-8">{alts?.msg} Gợi ý xe thay thế cùng Hub:</p>
        <div className="mt-16">
          {alts?.items.length === 0 && <div className="banner warn">Hub không còn xe thay thế, vui lòng chọn Hub lân cận.</div>}
          {alts?.items.map((a) => (
            <div key={a.id} className="list-item" onClick={() => { setAlts(null); reserve(a.id); }}>
              <div className="vehicle-ico">🛵</div><div style={{ flex: 1 }}><b>{a.code}</b><div className="small muted">{vehicleTypeLabel(a.type)}</div><Battery value={a.batteryPercent} /></div>
              <span className="btn sm">Đặt xe này</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
