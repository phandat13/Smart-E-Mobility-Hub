import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mtApi } from '../../api/mtApi';
import { useDemoState } from '../../mocks/store';
import { resourceLabel, resourceTitle } from '../../shared/format';
import { Button, Empty, Feedback, Field, Notice, PhotoUpload, Summary, useAction } from '../../shared/ui';
import './mt.css';

const vehicleCategories = ['Xẹp lốp / thủng săm', 'Phanh không ăn / kẹt xích', 'Pin tụt đột ngột / mất nguồn', 'Hư hỏng vật lý / va quẹt', 'Khóa xe không phản hồi', 'Khác'];
const portCategories = ['Không bắt đầu sạc', 'Ngắt phiên sạc', 'Cổng sạc không phản hồi', 'Hư hỏng vật lý', 'Nguồn điện bất thường', 'Khác'];
export function IncidentPage() {
  const state = useDemoState(); const action = useAction(); const navigate = useNavigate();
  const [hubId, setHubId] = useState('ktx-a'); const [kind, setKind] = useState<'VEHICLE' | 'PORT'>('VEHICLE');
  const [resourceId, setResourceId] = useState('UG-018'); const [category, setCategory] = useState(vehicleCategories[0]);
  const [description, setDescription] = useState(''); const [photos, setPhotos] = useState<string[]>([]);
  const resources = state.resources.filter(r => r.hubId === hubId && r.kind === kind);
  useEffect(() => { setResourceId(previous => resources.some(r => r.id === previous) ? previous : resources[0]?.id ?? ''); }, [hubId, kind]);
  const categories = kind === 'VEHICLE' ? vehicleCategories : portCategories;
  function submit(e: FormEvent) { e.preventDefault(); void action.run(() => mtApi.report({ resourceId, hubId, category, description, photos }), id => navigate(`/incidents/${id}/received`)); }
  return <main className="mt-report ui-panel" data-figma-node="15:1179"><div className="mt-report__heading"><span aria-hidden="true">⚠</span><div><h1>Báo cáo sự cố</h1><p>Phản ánh hỏng hóc của phương tiện dùng chung hoặc cổng sạc tại Hub</p></div></div><form onSubmit={submit} className="ui-stacked">
    <div className="ui-grid-2"><Field label="Hub xảy ra sự cố"><select value={hubId} onChange={e => setHubId(e.target.value)}>{state.hubs.map(h => <option value={h.id} key={h.id}>{h.name}</option>)}</select></Field><fieldset className="mt-fieldset"><legend>Đối tượng gặp lỗi</legend><div className="mt-segments">{(['VEHICLE', 'PORT'] as const).map(item => <button type="button" className="ui-choice" aria-pressed={kind === item} key={item} onClick={() => { setKind(item); setCategory(item === 'VEHICLE' ? vehicleCategories[0] : portCategories[0]); }}>{item === 'VEHICLE' ? '🛵 Phương tiện' : '🔌 Cổng sạc'}</button>)}</div></fieldset></div>
    <Field label={kind === 'VEHICLE' ? 'Mã phương tiện' : 'Mã cổng sạc'}><select required value={resourceId} onChange={e => setResourceId(e.target.value)}>{!resources.length && <option value="">Không có tài nguyên tại Hub này</option>}{resources.map(r => <option key={r.id} value={r.id}>{resourceTitle(r)}</option>)}</select></Field>
    <fieldset className="mt-fieldset"><legend>Loại lỗi</legend><div className="mt-category-grid">{categories.map(item => <label className={`mt-category ${category === item ? 'is-selected' : ''}`} key={item}><input type="radio" name="category" value={item} checked={category === item} onChange={() => setCategory(item)} />{item}</label>)}</div></fieldset>
    <Field label="Mô tả chi tiết"><textarea required minLength={10} maxLength={2000} rows={3} placeholder="Mô tả lỗi, vị trí và thời điểm xảy ra sự cố…" value={description} onChange={e => setDescription(e.target.value)} /></Field>
    <div><h2 className="mt-field-label">Ảnh hiện trường</h2><PhotoUpload photos={photos} onChange={setPhotos} /></div><Feedback action={action} /><Button type="submit" tone="danger" disabled={action.pending || !resourceId}>{action.pending ? 'Đang gửi báo cáo…' : 'Gửi báo cáo sự cố'}</Button>
  </form></main>;
}

export function IncidentReceivedPage() {
  const { id } = useParams(); const state = useDemoState(); const incident = state.incidents.find(i => i.id === id);
  if (!incident) return <main className="mt-report ui-panel"><Empty title="Không tìm thấy báo cáo" to="/incidents/new" action="Báo cáo sự cố" /></main>;
  const resource = state.resources.find(r => r.id === incident.resourceId)!;
  return <main className="mt-received ui-panel" data-figma-node="400:1021"><div className="mt-success" aria-hidden="true">✓</div><h1>Đã tiếp nhận báo cáo sự cố</h1><p className="ui-subtitle">Cảm ơn bạn đã phản ánh! Vui lòng lưu mã phiếu để đối soát.</p><div className="mt-received__code"><small>MÃ PHIẾU SỰ CỐ</small><strong>#{incident.id}</strong></div><Summary rows={[[ 'Đối tượng', resourceTitle(resource) ], ['Loại lỗi', incident.category], ['Trạng thái tài nguyên', <span className="mt-flag-text">{resource.status === 'FAULTY' ? 'Gắn cờ cảnh báo – ngừng cho đặt' : resourceLabel[resource.status]}</span>]]} /><Notice>Phiếu đã được chuyển vào hàng đợi giám sát của Đơn vị vận hành. Nếu sự cố đã được người khác báo trước, phản hồi của bạn được liên kết vào phiếu hiện có.</Notice><Link className="ui-button ui-button--primary pv-full" to="/pv">Về trang chủ</Link></main>;
}
