import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHubsApi, getHubDetailApi, type Hub, type VehicleStatus, type VehicleSummary } from '../../../api/hubApi';
import { getAreas, countAvailableVehicles } from '../../../mocks/hubsMock';
import './SearchHubPage.css';
import { RefreshIcon } from '../../../components/icons';

const STATUS_LABEL: Record<VehicleStatus, { text: string; cls: string }> = {
  AVAILABLE: { text: 'Sẵn sàng', cls: 'ok' },
  RESERVED: { text: 'Đã đặt trước', cls: 'warn' },
  NEEDS_CHARGE: { text: 'Cần sạc', cls: 'bad' },
  CHARGING: { text: 'Đang sạc', cls: 'info' },
  IN_USE: { text: 'Đang dùng', cls: 'muted' },
  MAINTENANCE: { text: 'Bảo trì', cls: 'muted' },
};

const batteryColor = (p: number) => (p >= 60 ? 'var(--primary)' : p >= 30 ? 'var(--amber)' : 'var(--red)');
const REFRESH_MS = 60_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** AC01 · Tìm kiếm & tra cứu tài nguyên Hub. Backend chưa có Hub API nên dữ liệu lấy từ mock. */
export default function SearchHubPage() {
  const navigate = useNavigate();

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [sortByBattery, setSortByBattery] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [rechecking, setRechecking] = useState(false);
  const [notice, setNotice] = useState('');

  const [queryInput, setQueryInput] = useState('');
  const [areaInput, setAreaInput] = useState('all');
  const [applied, setApplied] = useState({ query: '', area: 'all' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHubsApi(applied);
      setHubs(data);
      setUpdatedAt(new Date());
      setSelectedId((cur) => (cur !== null && data.some((h) => h.id === cur) ? cur : data[0]?.id ?? null));
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Không thể tải danh sách Hub');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  // Tự làm mới danh sách theo chu kỳ (im lặng, không bật spinner); thời điểm cập nhật cuối luôn hiển thị trên bản đồ.
  useEffect(() => {
    const timer = window.setInterval(() => {
      getHubsApi(applied)
        .then((data) => {
          setHubs(data);
          setUpdatedAt(new Date());
        })
        .catch(() => undefined);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [applied]);

  const selected = useMemo(() => hubs.find((h) => h.id === selectedId) ?? null, [hubs, selectedId]);

  const vehicles = useMemo(() => {
    if (!selected) return [] as VehicleSummary[];
    const list = [...selected.vehicles];
    return sortByBattery ? list.sort((a, b) => b.batteryPercent - a.batteryPercent) : list;
  }, [selected, sortByBattery]);

  // Chọn sẵn xe sẵn sàng đầu tiên mỗi khi đổi Hub.
  useEffect(() => {
    const first = selected?.vehicles.find((x) => x.status === 'AVAILABLE');
    setSelectedVehicleId(first ? first.id : null);
  }, [selected]);

  const selectedVehicle = vehicles.find((x) => x.id === selectedVehicleId) ?? null;
  const readyCount = selected ? countAvailableVehicles(selected) : 0;

  // Trạng thái xe có thể đã đổi từ lúc hiển thị: kiểm tra lại với dữ liệu mới nhất ngay trước khi đặt / nhận xe.
  const proceed = async (mode: 'reserve' | 'pickup') => {
    if (!selected || !selectedVehicle) return;
    setRechecking(true);
    setNotice('');
    try {
      const fresh = await getHubDetailApi(selected.id);
      const current = fresh?.vehicles.find((x) => x.id === selectedVehicle.id);
      if (!fresh || !current || current.status !== 'AVAILABLE') {
        if (fresh) setHubs((prev) => prev.map((h) => (h.id === fresh.id ? fresh : h)));
        setUpdatedAt(new Date());
        setNotice(`Xe ${selectedVehicle.code} không còn sẵn sàng. Danh sách đã được cập nhật, vui lòng chọn xe khác.`);
        return;
      }
      navigate('/student/booking', { state: { mode, hubId: selected.id, vehicleId: current.id } });
    } finally {
      setRechecking(false);
    }
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setApplied({ query: queryInput, area: areaInput });
  };

  const onRefresh = () => {
    setQueryInput('');
    setAreaInput('all');
    if (applied.query === '' && applied.area === 'all') void load();
    else setApplied({ query: '', area: 'all' });
  };

  return (
    <div className="hub-search">
      <div className="hub-search__main">
        <form className="hub-search__toolbar" onSubmit={onSearch} role="search">
          <label className="hub-search__search">
            <span className="sr-only">Tìm Hub theo tên, mã hoặc địa chỉ</span>
            <input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="Tìm Hub theo tên, mã, địa chỉ…" />
          </label>
          <label className="hub-search__select">
            <span className="sr-only">Lọc theo khu vực</span>
            <select value={areaInput} onChange={(e) => setAreaInput(e.target.value)}>
              {getAreas().map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="hub-search__btn hub-search__btn--primary">Tìm kiếm</button>
          <button type="button" className="hub-search__btn" onClick={onRefresh}><RefreshIcon /> Làm mới</button>
        </form>

        {error && (
          <div className="hub-search__alert" role="alert">
            {error}
            <button className="hub-search__link" onClick={() => void load()}>Thử lại</button>
          </div>
        )}

        <div className="hub-search__map" role="region" aria-label="Bản đồ khu vực các Hub">
          <div className="hub-search__map-block hub-search__map-block--a" />
          <div className="hub-search__map-block hub-search__map-block--b" />
          <div className="hub-search__map-block hub-search__map-block--park" />
          <div className="hub-search__map-block hub-search__map-block--water" />
          <div className="hub-search__map-road hub-search__map-road--h1" />
          <div className="hub-search__map-road hub-search__map-road--h2" />
          <div className="hub-search__map-road hub-search__map-road--v1" />
          <div className="hub-search__map-road hub-search__map-road--v2" />
          <div className="hub-search__map-road hub-search__map-road--d1" />
          <span className="hub-search__map-label" style={{ left: '8%', top: '12%' }}>Ngã tư Quốc Phòng</span>
          <span className="hub-search__map-label" style={{ left: '36%', top: '40%' }}>Trường ĐH Bách khoa</span>
          <span className="hub-search__map-label" style={{ left: '62%', top: '80%' }}>Tân Lập</span>

          {hubs.map((h) => (
            <button
              key={h.id}
              type="button"
              className={`hub-search__pin${h.id === selectedId ? ' is-selected' : ''}`}
              style={{ left: `${h.mapX}%`, top: `${h.mapY}%` }}
              onClick={() => setSelectedId(h.id)}
              aria-pressed={h.id === selectedId}
              aria-label={`${h.name}, ${countAvailableVehicles(h)} xe sẵn sàng`}
            >
              <span className="hub-search__pin-dot" aria-hidden="true" />
              {h.name} · {countAvailableVehicles(h)} xe
            </button>
          ))}
          {loading && <div className="hub-search__map-loading">Đang tải…</div>}
        </div>

        <section className="hub-search__results" aria-label="Kết quả tìm kiếm">
          <div className="hub-search__results-head">
            <strong>Kết quả tìm kiếm · {hubs.length} Hub</strong>
            <span className="hub-search__muted">
              <RefreshIcon /> Cập nhật {pad(updatedAt.getHours())}:{pad(updatedAt.getMinutes())}:{pad(updatedAt.getSeconds())} · tự làm mới mỗi 60 giây
            </span>
          </div>
          {hubs.length === 0 && !loading ? (
            <div className="hub-search__empty">
              Không tìm thấy Hub phù hợp.{' '}
              <button className="hub-search__link" onClick={onRefresh}>Xóa bộ lọc</button>
            </div>
          ) : (
            <div className="hub-search__results-list">
              {hubs.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`hub-search__result${h.id === selectedId ? ' is-selected' : ''}`}
                  onClick={() => setSelectedId(h.id)}
                  aria-pressed={h.id === selectedId}
                >
                  <span className="hub-search__result-name">{h.name}{h.note ? ` ${h.note}` : ''}</span>
                  <span className="hub-search__muted">
                    {countAvailableVehicles(h)} xe · {h.availableDocks} chỗ · {h.availableChargingPorts} cổng
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="hub-search__panel" aria-label="Thông tin Hub">
        {!selected ? (
          <p className="hub-search__empty">Chọn một Hub trên bản đồ hoặc trong danh sách để xem chi tiết.</p>
        ) : (
          <>
            <div className="hub-search__panel-eyebrow">
              <span>THÔNG TIN HUB</span>
              <span className={`hub-search__status ${selected.active ? 'ok' : 'muted'}`}>● {selected.active ? 'Hoạt động' : 'Tạm ngưng'}</span>
            </div>
            <h2 className="hub-search__panel-title">{selected.name}{selected.note ? ` ${selected.note}` : ''}</h2>
            <p className="hub-search__panel-addr">{selected.address} · cách bạn {selected.distanceM} m</p>

            <div className="hub-search__tiles">
              <div className="hub-search__tile"><span>Xe sẵn sàng</span><strong>{readyCount} xe</strong></div>
              <div className="hub-search__tile"><span>Pin trung bình</span><strong>{selected.avgBatteryPercent}%</strong></div>
              <div className="hub-search__tile"><span>Chỗ đỗ trống</span><strong>{selected.availableDocks} / {selected.totalDocks}</strong></div>
              <div className="hub-search__tile"><span>Cổng sạc trống</span><strong>{selected.availableChargingPorts} / {selected.chargingPorts}</strong></div>
            </div>

            <div className="hub-search__vhead">
              <strong>Phương tiện tại Hub</strong>
              <button type="button" className="hub-search__link" onClick={() => setSortByBattery((s) => !s)}>
                Sắp xếp: {sortByBattery ? 'Pin ↓' : 'Mã xe'}
              </button>
            </div>

            <ul className="hub-search__vlist">
              {vehicles.map((x) => {
                const st = STATUS_LABEL[x.status];
                const selectable = x.status === 'AVAILABLE';
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      className={`hub-search__vehicle${x.id === selectedVehicleId ? ' is-selected' : ''}`}
                      onClick={() => selectable && setSelectedVehicleId(x.id)}
                      disabled={!selectable}
                      aria-pressed={x.id === selectedVehicleId}
                    >
                      <span className="hub-search__vehicle-top">
                        <strong>{x.code}</strong>
                        <span className={`hub-search__chip ${st.cls}`}>{st.text}</span>
                      </span>
                      <span className="hub-search__vehicle-bottom">
                        <span className="hub-search__muted">{x.type} · ~{x.rangeKm} km</span>
                        <span className="hub-search__bar" aria-hidden="true">
                          <span style={{ width: `${x.batteryPercent}%`, background: batteryColor(x.batteryPercent) }} />
                        </span>
                        <span className="hub-search__pct">{x.batteryPercent}%</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              className="hub-search__cta"
              disabled={!selectedVehicle || rechecking}
              onClick={() => void proceed('reserve')}
            >
              {rechecking ? 'Đang kiểm tra lại trạng thái xe…' : selectedVehicle ? `Đặt trước ${selectedVehicle.code} (giữ chỗ 15 phút)` : 'Không có xe sẵn sàng để đặt'}
            </button>
            {notice && <p className="hub-search__notice" role="alert">{notice}</p>}
            <button type="button" className="hub-search__cta hub-search__cta--ghost" disabled={!selectedVehicle || rechecking} onClick={() => void proceed('pickup')}>
              Nhận xe ngay · quét mã QR trên xe
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
