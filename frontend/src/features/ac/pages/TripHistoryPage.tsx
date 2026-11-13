import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTripsApi, getTripDetailApi, type TripSummary, type TripDetail } from '../../../api/authApi';
import { TRIPS_PAGE_SIZE } from '../constants';
import { tripCode } from '../utils/tripCode';
import './TripHistoryPage.css';
import { StarIcon } from '../../../components/icons';

type TripTab = 'trips' | 'bookings';


/** Hàng 5 sao, `value` sao đầu là sao đặc. */
const StarRow = ({ value }: { value: number }) => (
  <>
    {[1, 2, 3, 4, 5].map((n) => (
      <StarIcon key={n} size={14} filled={n <= value} />
    ))}
  </>
);

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
const fmtClock = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtMoney = (v: number) => `${v.toLocaleString('vi-VN')} đ`;
const fmtKm = (km: number | null) => (km === null || km === undefined ? '—' : `${km.toFixed(1)} km`);

/** AC05 · Xem lịch sử chuyến đi (kèm cửa vào AC06 · Đánh giá chuyến đi). */
export default function TripHistoryPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<TripTab>('trips');
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TripDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getTripsApi({ page, size: TRIPS_PAGE_SIZE });
      setTrips(res.items);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalItems);
      setSelectedId((cur) => (cur !== null && res.items.some((t) => t.id === cur) ? cur : res.items[0]?.id ?? null));
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Không thể tải lịch sử chuyến đi');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (tab === 'trips') void loadTrips();
  }, [tab, loadTrips]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getTripDetailApi(selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as { message?: string }).message || 'Không thể tải chi tiết chuyến đi');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const ratingChip = (t: TripSummary) => {
    if (!t.rated) return <span className="trip-history__chip trip-history__chip--amber">Chưa đánh giá</span>;
    const stars = t.vehicleStars ?? null;
    if (t.incidentReported || (stars !== null && stars <= 2)) return <span className="trip-history__chip trip-history__chip--red"><StarIcon size={12} /> {stars ?? '–'} · Đã gửi ticket</span>;
    return <span className="trip-history__chip trip-history__chip--green">{stars !== null ? <><StarIcon size={12} /> {stars}</> : 'Đã đánh giá'}</span>;
  };

  const from = totalItems === 0 ? 0 : page * TRIPS_PAGE_SIZE + 1;
  const to = Math.min((page + 1) * TRIPS_PAGE_SIZE, totalItems);

  return (
    <div className="trip-history">
      <div className="trip-history__head">
        <div>
          <div className="trip-history__eyebrow">CHUYẾN ĐI CỦA TÔI</div>
          <h1 className="trip-history__title">Lịch sử chuyến đi</h1>
        </div>
        <div className="trip-history__seg" role="tablist" aria-label="Chuyển đổi lịch sử">
          <button role="tab" aria-selected={tab === 'trips'} className={`trip-history__seg-btn${tab === 'trips' ? ' is-active' : ''}`} onClick={() => setTab('trips')}>
            Lịch sử chuyến đi
          </button>
          <button role="tab" aria-selected={tab === 'bookings'} className={`trip-history__seg-btn${tab === 'bookings' ? ' is-active' : ''}`} onClick={() => setTab('bookings')}>
            Lịch sử đặt xe
          </button>
        </div>
      </div>

      {error && (
        <div className="trip-history__alert" role="alert">
          {error}
          <button className="trip-history__link" onClick={() => void loadTrips()}>Thử lại</button>
        </div>
      )}

      {tab === 'bookings' ? (
        <div className="trip-history__card trip-history__placeholder">
          <h2>Lịch sử đặt xe</h2>
          <p>Màn hình này thuộc nhóm RE (RE02), sẽ được tích hợp sau.</p>
        </div>
      ) : (
        <div className="trip-history__grid">
          <section className="trip-history__card" aria-label="Danh sách chuyến đi">
            <h2 className="trip-history__card-title">{totalItems} chuyến đi đã hoàn thành · mới nhất trước</h2>

            <table className="trip-history__table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Lộ trình</th>
                  <th>Quãng đường</th>
                  <th>Chi phí</th>
                  <th>Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="trip-history__empty">Đang tải…</td></tr>
                ) : trips.length === 0 ? (
                  <tr><td colSpan={5} className="trip-history__empty">Bạn chưa có chuyến đi nào.</td></tr>
                ) : (
                  trips.map((t) => (
                    <tr
                      key={t.id}
                      className={t.id === selectedId ? 'is-selected' : ''}
                      onClick={() => setSelectedId(t.id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedId(t.id)}
                      aria-selected={t.id === selectedId}
                    >
                      <td>
                        <div className="trip-history__strong">{fmtDay(t.startedAt)}</div>
                        <div className="trip-history__sub">{fmtClock(t.startedAt)}</div>
                      </td>
                      <td>
                        <div className="trip-history__strong">{t.startHubName ?? `Hub #${t.startHubId}`} → {t.endHubName ?? `Hub #${t.endHubId}`}</div>
                        <div className="trip-history__sub">{t.vehicleCode ?? `Xe #${t.vehicleId}`}{t.durationMinutes ? ` · ${t.durationMinutes} phút` : ''}</div>
                      </td>
                      <td>{fmtKm(t.distanceKm)}</td>
                      <td>{fmtMoney(t.cost)}</td>
                      <td>{ratingChip(t)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="trip-history__foot">
              <span>Hiển thị {from === 0 ? 0 : `${from}–${to}`} / {totalItems} chuyến</span>
              {totalPages > 1 && (
                <nav className="trip-history__pager" aria-label="Phân trang">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading} aria-label="Trang trước">‹</button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} className={i === page ? 'is-active' : ''} onClick={() => setPage(i)} disabled={loading} aria-current={i === page ? 'page' : undefined}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading} aria-label="Trang sau">›</button>
                </nav>
              )}
            </div>
          </section>

          <aside className="trip-history__card trip-history__detail" aria-label="Chi tiết chuyến đi">
            {!detail && !detailLoading && <p className="trip-history__empty">Chọn một chuyến đi để xem chi tiết.</p>}
            {detailLoading && <p className="trip-history__empty">Đang tải chi tiết…</p>}
            {detail && !detailLoading && (
              <>
                <h2 className="trip-history__card-title">Chi tiết chuyến #{tripCode(detail)}</h2>
                <div className="trip-history__miniroute" aria-hidden="true">
                  <span className="trip-history__miniroute-pin trip-history__miniroute-pin--a">A</span>
                  <span className="trip-history__miniroute-line" />
                  <span className="trip-history__miniroute-pin trip-history__miniroute-pin--b">B</span>
                </div>
                <dl className="trip-history__dl">
                  <div><dt>Thời gian</dt><dd>{fmtClock(detail.startedAt)} – {fmtClock(detail.endedAt)} ({detail.durationMinutes} phút)</dd></div>
                  <div><dt>Lộ trình</dt><dd>{detail.startHubName} → {detail.endHubName}</dd></div>
                  <div><dt>Quãng đường</dt><dd>{fmtKm(detail.distanceKm)}</dd></div>
                  <div><dt>Pin lúc nhận → trả</dt><dd>{detail.startBattery ?? '—'}% → {detail.endBattery ?? '—'}%</dd></div>
                  <div><dt>Phương tiện</dt><dd>{detail.vehicleCode}{detail.vehicleType ? ` · ${detail.vehicleType}` : ''}</dd></div>
                  <div><dt>Chi phí chuyến đi</dt><dd className="trip-history__cost">{fmtMoney(detail.cost)}</dd></div>
                </dl>

                {detail.rating ? (
                  <div className="trip-history__rated">
                    <div className="trip-history__rated-row"><span>Chất lượng xe</span><span className="trip-history__stars" aria-label={`${detail.rating.vehicleStars} trên 5 sao`}><StarRow value={detail.rating.vehicleStars} /></span></div>
                    <div className="trip-history__rated-row"><span>Dịch vụ Hub</span><span className="trip-history__stars" aria-label={`${detail.rating.hubStars} trên 5 sao`}><StarRow value={detail.rating.hubStars} /></span></div>
                    {detail.rating.comment && <p className="trip-history__rated-comment">“{detail.rating.comment}”</p>}
                    {detail.rating.incidentReported && <span className="trip-history__chip trip-history__chip--red">Đã gửi ticket sự cố</span>}
                  </div>
                ) : (
                  <button className="trip-history__primary" onClick={() => navigate(`/account/trips/${detail.id}/rate`)}>
                    <StarIcon size={14} /> Đánh giá chuyến đi
                  </button>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
