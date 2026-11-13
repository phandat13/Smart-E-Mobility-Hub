import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTripDetailApi, rateTripApi, type TripDetail, type RatingRequest } from '../../../api/authApi';
import { tripCode } from '../utils/tripCode';
import { CloseIcon, PlusIcon } from '../../../components/icons';
import StarRating from '../components/StarRating';
import { INCIDENT_CATEGORIES, MAX_INCIDENT_PHOTOS } from '../constants';
import './RateTripPage.css';

/** AC06 · Đánh giá chuyến đi (đánh giá xe + Hub, nhận xét, báo sự cố kèm ảnh). */
export default function RateTripPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tripId = id ? parseInt(id, 10) : NaN;

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const [vehicleStars, setVehicleStars] = useState(0);
  const [hubStars, setHubStars] = useState(0);
  const [comment, setComment] = useState('');
  const [reportIncident, setReportIncident] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<{ stars?: string; category?: string; photos?: string }>({});

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  useEffect(() => {
    if (Number.isNaN(tripId)) {
      setServerError('Mã chuyến đi không hợp lệ');
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripDetailApi(tripId)
      .then(setTrip)
      .catch((err: unknown) => {
        const e = err as { message?: string; status?: number };
        setServerError(e.status === 404 ? 'Không tìm thấy chuyến đi' : e.message || 'Không thể tải thông tin chuyến đi');
      })
      .finally(() => setLoading(false));
  }, [tripId]);

  const back = () => navigate('/account/trips');

  const onPhotos = (e: ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (photos.length + added.length > MAX_INCIDENT_PHOTOS) return setErrors((p) => ({ ...p, photos: `Tối đa ${MAX_INCIDENT_PHOTOS} ảnh` }));
    setErrors((p) => ({ ...p, photos: undefined }));
    setPhotos((p) => [...p, ...added]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (vehicleStars === 0 || hubStars === 0) next.stars = 'Vui lòng đánh giá cả xe và Hub';
    if (reportIncident && !incidentCategory) next.category = 'Vui lòng chọn loại sự cố';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const body: RatingRequest = {
        vehicleStars,
        hubStars,
        comment: comment.trim() || undefined,
        photoUrls: [], // Backend chưa có endpoint upload ảnh (plan mục 9): chỉ giữ ảnh cục bộ.
        reportIncident,
        incidentCategory: reportIncident ? incidentCategory : undefined,
        safetyIssue: false,
      };
      await rateTripApi(tripId, body);
      setSuccess('Đã gửi đánh giá, cảm ơn bạn!');
      setTrip(await getTripDetailApi(tripId));
    } catch (err: unknown) {
      const { message, code } = err as { message?: string; code?: string };
      setServerError(code === 'TRIP_ALREADY_RATED' ? 'Chuyến đi này đã được đánh giá' : message || 'Gửi đánh giá thất bại, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="rate-trip rate-trip__center">Đang tải thông tin chuyến đi…</div>;

  if (!trip) {
    return (
      <div className="rate-trip">
        <div className="rate-trip__card rate-trip__center">
          <h2>Không tìm thấy chuyến đi</h2>
          <p>{serverError || 'Chuyến đi không tồn tại hoặc đã bị xóa'}</p>
          <button type="button" className="rate-trip__btn rate-trip__btn--primary" onClick={back}>Quay lại lịch sử</button>
        </div>
      </div>
    );
  }

  const readOnly = trip.rating !== null;
  const rating = trip.rating;
  const subline = `${trip.startHubName} → ${trip.endHubName} · ${trip.durationMinutes ?? '—'} phút · ${trip.distanceKm != null ? `${trip.distanceKm.toFixed(1)} km` : '—'} · ${trip.vehicleCode}`;

  return (
    <div className="rate-trip">
      <form className="rate-trip__card" onSubmit={submit} noValidate>
        <h1 className="rate-trip__title">Đánh giá chuyến đi #{tripCode(trip)}</h1>
        <p className="rate-trip__sub">{subline}</p>

        {serverError && <div className="rate-trip__alert rate-trip__alert--err" role="alert">{serverError}</div>}
        {success && <div className="rate-trip__alert rate-trip__alert--ok" role="status">{success}</div>}

        <div className="rate-trip__rows">
          <div>
            <div className="rate-trip__label">Chất lượng xe {trip.vehicleCode}</div>
            <StarRating label="Chất lượng xe" value={readOnly ? rating!.vehicleStars : vehicleStars} onChange={readOnly ? undefined : (n) => { setVehicleStars(n); setErrors((p) => ({ ...p, stars: undefined })); }} disabled={submitting} />
          </div>
          <div>
            <div className="rate-trip__label">Dịch vụ tại Hub {trip.endHubName}</div>
            <StarRating label="Dịch vụ Hub" value={readOnly ? rating!.hubStars : hubStars} onChange={readOnly ? undefined : (n) => { setHubStars(n); setErrors((p) => ({ ...p, stars: undefined })); }} disabled={submitting} />
          </div>
        </div>
        {errors.stars && <p className="rate-trip__err" role="alert">{errors.stars}</p>}

        <div className="rate-trip__field">
          <label className="rate-trip__label" htmlFor="rate-trip__comment">Nhận xét</label>
          {readOnly ? (
            <p className="rate-trip__readonly">{rating!.comment || 'Không có nhận xét'}</p>
          ) : (
            <div className="rate-trip__textwrap">
              <textarea id="rate-trip__comment" rows={4} maxLength={500} value={comment} disabled={submitting} placeholder="Chia sẻ trải nghiệm của bạn…" onChange={(e) => setComment(e.target.value)} />
              <span className="rate-trip__count">{comment.length} / 500</span>
            </div>
          )}
        </div>

        {readOnly ? (
          rating!.incidentReported && <div className="rate-trip__alert rate-trip__alert--warn">Bạn đã báo cáo sự cố cho chuyến đi này. Đơn vị vận hành sẽ xử lý.</div>
        ) : (
          <fieldset className="rate-trip__incident" disabled={submitting}>
            <label className="rate-trip__check">
              <input type="checkbox" checked={reportIncident} onChange={(e) => setReportIncident(e.target.checked)} />
              <span>Báo cáo sự cố kèm ảnh chụp</span>
            </label>
            {reportIncident && (
              <>
                <div className="rate-trip__field">
                  <label className="rate-trip__label" htmlFor="rate-trip__cat">Loại sự cố</label>
                  <select id="rate-trip__cat" value={incidentCategory} onChange={(e) => { setIncidentCategory(e.target.value); setErrors((p) => ({ ...p, category: undefined })); }}>
                    <option value="">Chọn loại sự cố</option>
                    {INCIDENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="rate-trip__err" role="alert">{errors.category}</p>}
                </div>
                <div className="rate-trip__label">Ảnh chụp (tối đa {MAX_INCIDENT_PHOTOS})</div>
                <div className="rate-trip__photos">
                  {previews.map((src, i) => (
                    <div key={src} className="rate-trip__photo">
                      <img src={src} alt={`Ảnh sự cố ${i + 1}`} />
                      <button type="button" aria-label={`Xóa ảnh ${i + 1}`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}><CloseIcon size={12} /></button>
                    </div>
                  ))}
                  {photos.length < MAX_INCIDENT_PHOTOS && (
                    <label className="rate-trip__photo rate-trip__photo--add">
                      <PlusIcon />
                      <span className="sr-only">Thêm ảnh</span>
                      <input type="file" accept="image/*" multiple onChange={onPhotos} />
                    </label>
                  )}
                </div>
                {errors.photos && <p className="rate-trip__err" role="alert">{errors.photos}</p>}
                <p className="rate-trip__hint">Ảnh hiện chỉ lưu cục bộ trên trình duyệt vì backend chưa có API tải ảnh.</p>
              </>
            )}
          </fieldset>
        )}

        <div className="rate-trip__note">
          Đánh giá ≤ 2 sao hoặc có báo sự cố sẽ tạo ticket hỗ trợ gửi Đơn vị vận hành.
        </div>

        <div className="rate-trip__actions">
          <button type="button" className="rate-trip__btn" onClick={back} disabled={submitting}>{readOnly ? 'Quay lại lịch sử' : 'Bỏ qua'}</button>
          {!readOnly && (
            <button type="submit" className="rate-trip__btn rate-trip__btn--primary" disabled={submitting || vehicleStars === 0 || hubStars === 0}>
              {submitting ? 'Đang gửi…' : 'Gửi đánh giá'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
