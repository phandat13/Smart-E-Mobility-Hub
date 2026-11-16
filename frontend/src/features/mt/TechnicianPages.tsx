import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mtApi } from '../../api/mtApi';
import { recordIds, useDemoState } from '../../mocks/store';
import { date, priorityLabel, progressLabel, resourceLabel, resourceType, time } from '../../shared/format';
import type { MaintenanceOrder, MaintenanceTicket, Part, RepairProgress } from '../../shared/types';
import { Badge, Button, Empty, Feedback, Field, Notice, PhotoUpload, useAction } from '../../shared/ui';
import './mt.css';

const terminal = (ticket: MaintenanceTicket) => ticket.progress === 'DONE' || ticket.progress === 'UNREPAIRABLE';
function OrderSidebar({ order, selectedId }: { order: MaintenanceOrder; selectedId: string }) {
  const state = useDemoState();
  return <aside className="ui-panel mt-tech-sidebar"><h2>Lệnh bảo trì #{order.id}</h2><p className="ui-subtitle">Ưu tiên {priorityLabel[order.priority].toLowerCase()} · hạn {time(order.dueAt)} · {order.resourceIds.length} {order.resourceIds.every(id => state.resources.find(r => r.id === id)?.kind === 'VEHICLE') ? 'xe' : 'tài nguyên'}</p><div className="ui-stacked">{order.resourceIds.map(id => {
    const resource = state.resources.find(r => r.id === id)!; const ticket = state.tickets.find(t => t.orderId === order.id && t.resourceId === id);
    return <Link className={`mt-tech-resource ${id === selectedId ? 'is-selected' : ''}`} key={id} to={ticket ? `/tech/maintenance/tickets/${ticket.id}` : `/tech/maintenance/tickets/new/${order.id}/${id}`}><strong>{resource.kind === 'PORT' ? '🔌' : '🛵'} {resource.id}</strong><small>{resource.errorCode || 'Đã xử lý'} · {state.hubs.find(h => h.id === resource.hubId)?.shortName}</small><Badge tone={ticket?.progress === 'DONE' ? 'green' : ticket?.progress === 'UNREPAIRABLE' ? 'red' : ticket ? 'amber' : id === selectedId ? 'blue' : 'slate'}>{ticket ? progressLabel[ticket.progress] : id === selectedId ? 'Đang lập phiếu' : 'Chưa xử lý'}</Badge></Link>;
  })}</div><Link className="ui-link" to="/tech/maintenance">← Danh sách lệnh</Link></aside>;
}
function Workspace({ order, selectedId, children }: { order: MaintenanceOrder; selectedId: string; children: ReactNode }) {
  return <main className="mt-tech-workspace"><OrderSidebar order={order} selectedId={selectedId} />{children}</main>;
}
export function TechnicianListPage({ history = false, ticketsOnly = false }: { history?: boolean; ticketsOnly?: boolean }) {
  const state = useDemoState();
  const orders = state.orders.filter(o => o.technicianId === state.activeTechnicianId && (history ? o.status === 'CLOSED' : o.status === 'OPEN'));
  const tickets = state.tickets.filter(t => state.orders.some(o => o.id === t.orderId && o.technicianId === state.activeTechnicianId));
  return <main className="mt-tech-list"><div className="ui-page-heading"><div><p className="ui-eyebrow">ỨNG DỤNG KỸ THUẬT VIÊN</p><h1>{history ? 'Lịch sử bảo trì' : ticketsOnly ? 'Phiếu bảo trì của tôi' : 'Lệnh bảo trì được phân công'}</h1><p>Chỉ hiển thị công việc của kỹ thuật viên demo đang chọn.</p></div><Link className="ui-link" to="/setup">Đổi kỹ thuật viên demo</Link></div>
    {ticketsOnly ? <section className="ui-panel">{!tickets.length ? <Empty title="Chưa có phiếu bảo trì" to="/tech/maintenance" action="Xem lệnh được giao" /> : <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>SỐ PHIẾU</th><th>TÀI NGUYÊN</th><th>LỆNH LIÊN KẾT</th><th>TRẠNG THÁI</th></tr></thead><tbody>{tickets.map(t => <tr key={t.id}><td><Link to={`/tech/maintenance/tickets/${t.id}`}>{t.id}</Link></td><td>{t.resourceId}</td><td>{t.orderId}</td><td><Badge tone={t.progress === 'DONE' ? 'green' : t.progress === 'UNREPAIRABLE' ? 'red' : 'amber'}>{progressLabel[t.progress]}</Badge></td></tr>)}</tbody></table></div>}</section> : !orders.length ? <section className="ui-panel"><Empty title={history ? 'Chưa có lệnh đã đóng' : 'Chưa có lệnh được phân công'}>Tạo và phân công lệnh từ cổng vận hành để bắt đầu quy trình bảo trì.</Empty></section> : <div className="mt-tech-orders">{orders.map(o => <article className="ui-panel" key={o.id}><Badge tone={o.priority === 'HIGH' ? 'red' : 'amber'}>Ưu tiên {priorityLabel[o.priority].toLowerCase()}</Badge><h2>{o.id}</h2><p className="ui-subtitle">Hạn {time(o.dueAt)} · {date(o.dueAt)} · {o.resourceIds.length} tài nguyên</p>{o.resourceIds.map(id => {
      const ticket = state.tickets.find(t => t.orderId === o.id && t.resourceId === id);
      return <Link className="mt-order-link" key={id} to={ticket ? `/tech/maintenance/tickets/${ticket.id}` : `/tech/maintenance/tickets/new/${o.id}/${id}`}><strong>{id}</strong><Badge tone={ticket?.progress === 'DONE' ? 'green' : 'blue'}>{ticket ? progressLabel[ticket.progress] : 'Lập phiếu →'}</Badge></Link>;
    })}</article>)}</div>}
  </main>;
}

export function NewTicketPage() {
  const { orderId, resourceId } = useParams(); const state = useDemoState();
  const order = state.orders.find(o => o.id === orderId && o.technicianId === state.activeTechnicianId && o.resourceIds.includes(resourceId ?? ''));
  if (!order || !resourceId) return <main className="mt-tech-list ui-panel"><Empty title="Lệnh không tồn tại hoặc không thuộc kỹ thuật viên này" to="/tech/maintenance" action="Xem lệnh của tôi" /></main>;
  const existing = state.tickets.find(t => t.orderId === order.id && t.resourceId === resourceId);
  if (existing) return <Workspace order={order} selectedId={resourceId}><section className="ui-panel"><Empty title="Tài nguyên đã có phiếu bảo trì" to={`/tech/maintenance/tickets/${existing.id}`} action="Mở phiếu hiện có" /></section></Workspace>;
  return <Workspace order={order} selectedId={resourceId}><TicketForm key={`${order.id}-${resourceId}`} order={order} resourceId={resourceId} /></Workspace>;
}
function TicketForm({ order, resourceId }: { order: MaintenanceOrder; resourceId: string }) {
  const state = useDemoState(); const resource = state.resources.find(r => r.id === resourceId)!; const action = useAction(); const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState(''); const [repairItems, setRepairItems] = useState<string[]>([]); const [parts, setParts] = useState<Part[]>([]); const [photos, setPhotos] = useState<string[]>([]);
  const categories = resource.kind === 'VEHICLE' ? ['Kiểm tra & hiệu chỉnh BMS', 'Thay cell pin lỗi', 'Vệ sinh cổng sạc', 'Kiểm tra phanh & lốp'] : ['Kiểm tra nguồn điện', 'Thay đầu nối sạc', 'Vệ sinh cổng sạc', 'Kiểm tra kết nối thiết bị'];
  const setPart = (index: number, key: keyof Part, value: string | number) => setParts(previous => previous.map((part, i) => i === index ? { ...part, [key]: value } : part));
  function submit(e: FormEvent) { e.preventDefault(); void action.run(() => mtApi.saveTicket({ orderId: order.id, resourceId, diagnosis, repairItems, parts, photos }), id => navigate(`/tech/maintenance/tickets/${id}`)); }
  return <section className="ui-panel mt-tech-main" data-figma-node="400:2849"><h1>Lập phiếu bảo trì · {resource.id}</h1><p className="ui-subtitle">Liên kết lệnh #{order.id} · {resourceType(resource)} · {state.hubs.find(h => h.id === resource.hubId)?.shortName}</p><form onSubmit={submit} className="ui-stacked"><div className="ui-grid-3"><Field label="Mã lỗi hệ thống"><input readOnly value={resource.errorCode} /></Field><Field label="Thời điểm tiếp nhận"><input readOnly value={`${time(state.now)} · ${date(state.now)}`} /></Field><Field label="Số phiếu" hint="Cấp chính thức khi lưu phiếu"><input readOnly value={recordIds.ticket(state)} /></Field></div>
    <Field label="Tình trạng lỗi ghi nhận"><textarea required minLength={10} maxLength={2000} rows={3} value={diagnosis} placeholder="Mô tả kết quả kiểm tra và tình trạng thực tế của tài nguyên…" onChange={e => setDiagnosis(e.target.value)} /></Field>
    <fieldset className="mt-fieldset"><legend>Hạng mục sửa chữa</legend><div className="mt-repair-options">{categories.map(item => <label key={item}><input type="checkbox" checked={repairItems.includes(item)} onChange={e => setRepairItems(previous => e.target.checked ? [...previous, item] : previous.filter(value => value !== item))} />{item}</label>)}</div></fieldset>
    <div><h2 className="mt-field-label">Linh kiện thay thế</h2>{parts.length > 0 && <div className="ui-table-wrap"><table className="ui-table mt-parts"><thead><tr><th>LINH KIỆN</th><th>MÃ</th><th>SỐ LƯỢNG</th><th /></tr></thead><tbody>{parts.map((part, i) => <tr key={i}><td><input className="ui-input" required aria-label={`Tên linh kiện ${i + 1}`} value={part.name} onChange={e => setPart(i, 'name', e.target.value)} /></td><td><input className="ui-input" required aria-label={`Mã linh kiện ${i + 1}`} value={part.code} onChange={e => setPart(i, 'code', e.target.value)} /></td><td><input className="ui-input" type="number" required min="1" max="999" step="1" aria-label={`Số lượng linh kiện ${i + 1}`} value={part.quantity} onChange={e => setPart(i, 'quantity', Number(e.target.value))} /></td><td><button type="button" className="ui-icon-button" aria-label={`Xóa linh kiện ${i + 1}`} onClick={() => setParts(previous => previous.filter((_, index) => index !== i))}>×</button></td></tr>)}</tbody></table></div>}<Button tone="soft" className="ui-button--small" onClick={() => setParts(previous => [...previous, { name: '', code: '', quantity: 1 }])}>+ Thêm linh kiện</Button></div>
    <div><h2 className="mt-field-label">Ảnh hiện trạng</h2><PhotoUpload photos={photos} onChange={setPhotos} /></div><Feedback action={action} /><div className="ui-actions"><Button tone="secondary" disabled={action.pending} onClick={() => navigate('/tech/maintenance')}>Hủy</Button><Button type="submit" disabled={action.pending || order.status === 'CLOSED'}>{action.pending ? 'Đang lưu…' : 'Lưu phiếu bảo trì'}</Button></div>
  </form></section>;
}

export function TicketProgressPage() {
  const { id } = useParams(); const state = useDemoState();
  const ticket = state.tickets.find(t => t.id === id); const order = state.orders.find(o => o.id === ticket?.orderId && o.technicianId === state.activeTechnicianId);
  if (!ticket || !order) return <main className="mt-tech-list ui-panel"><Empty title="Không tìm thấy phiếu thuộc kỹ thuật viên này" to="/tech/maintenance" action="Xem lệnh của tôi" /></main>;
  return <Workspace order={order} selectedId={ticket.resourceId}><ProgressForm key={ticket.id} ticket={ticket} order={order} /></Workspace>;
}
function ProgressForm({ ticket, order }: { ticket: MaintenanceTicket; order: MaintenanceOrder }) {
  const state = useDemoState(); const action = useAction(); const resource = state.resources.find(r => r.id === ticket.resourceId)!;
  const [progress, setProgress] = useState<RepairProgress>('DONE'); const [notes, setNotes] = useState(ticket.notes);
  const closed = terminal(ticket);
  return <section className="ui-panel mt-tech-main" data-figma-node="400:2927"><h1>Cập nhật tình trạng bảo trì · {ticket.resourceId}</h1><p className="ui-subtitle">Phiếu {ticket.id} · lệnh #{order.id}</p>
    {closed ? <Notice tone={ticket.progress === 'DONE' ? 'success' : 'warning'}>{ticket.progress === 'DONE' ? 'Đã ghi nhận hoàn tất. Tài nguyên chỉ sẵn sàng sau bước xác minh cảm biến.' : 'Tài nguyên đã ngừng sử dụng và không được mở lại.'} Trạng thái: {resourceLabel[resource.status]}.</Notice> : <><h2 className="mt-field-label">Trạng thái bảo trì</h2><div className="mt-progress-options">{(['REPAIRING', 'WAITING_PARTS', 'DONE', 'UNREPAIRABLE'] as const).map((value, index) => <button type="button" className={`ui-choice ${value === 'DONE' ? 'mt-done-choice' : ''}`} key={value} aria-pressed={progress === value} onClick={() => setProgress(value)}>{['🔧', '📦', '✓', '⛔'][index]} {progressLabel[value]}</button>)}</div></>}
    <h2 className="mt-field-label">Tiến trình</h2><ol className="mt-progress-timeline">{ticket.timeline.map((event, index) => <li key={index}>{time(event.at)} · {event.message}</li>)}</ol>
    <div className="mt-verification"><h2>Xác minh tự động sau khi xác nhận “Hoàn tất”</h2><p>Lệnh bảo trì đóng khi mọi {resource.kind === 'VEHICLE' ? 'xe' : 'tài nguyên'} trong lệnh đã xử lý xong · {resource.kind === 'VEHICLE' ? 'xe' : 'tài nguyên'} chuyển “Khóa bảo trì” → “Chờ kiểm tra” → hệ thống kiểm tra tình trạng thực tế</p><div className="ui-grid-2">{[
      { ok: resource.telemetryFresh && !state.deviceOffline, label: 'Dữ liệu cảm biến mới, không báo lỗi', detail: resource.telemetryFresh ? 'Đã có dữ liệu mô phỏng' : 'Chưa có dữ liệu mới' },
      { ok: resource.correctHub, label: `Vị trí đúng Hub ${state.hubs.find(h => h.id === resource.hubId)?.shortName}`, detail: resource.correctHub ? 'Đúng vị trí' : 'Cần xác minh vị trí' },
      { ok: resource.kind === 'PORT' || resource.battery >= 20, label: resource.kind === 'PORT' ? 'Kiểm tra nguồn và kết nối' : 'Mức pin ≥ 20%', detail: resource.kind === 'PORT' ? 'Thiết bị sạc' : `Hiện tại ${resource.battery}%` },
      { ok: !state.incidents.some(i => i.resourceId === resource.id && i.orderId !== order.id && i.status !== 'CLOSED'), label: 'Không còn sự cố / phiếu mở khác', detail: 'Phiếu liên kết đóng khi hoàn tất sửa chữa' },
    ].map(check => <div className="mt-check" key={check.label}><span className={check.ok ? 'is-ok' : 'is-bad'}>{check.ok ? '✓' : '×'}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div></div>)}</div><Notice tone="warning">{resource.kind === 'VEHICLE' && resource.battery < 20 ? 'Kết quả dự kiến: pin dưới ngưỡng → xe chuyển “Cần sạc”, vào hàng đợi sạc và thông báo cho Đơn vị vận hành.' : 'Chỉ chuyển “Sẵn sàng” khi dữ liệu cảm biến và vị trí hợp lệ, không còn sự cố mở.'}</Notice></div>
    <details className="mt-ticket-details"><summary>Thông tin phiếu & linh kiện đã lưu</summary><p>{ticket.diagnosis}</p><p>{ticket.repairItems.join(' · ')}</p>{ticket.parts.map((part, index) => <p key={index}>{part.name} · {part.code} · SL: {part.quantity}</p>)}{!!ticket.photos.length && <div className="mt-photo-list">{ticket.photos.map((photo, i) => <img key={i} src={photo} alt={`Ảnh bảo trì ${i + 1}`} />)}</div>}</details>
    {!closed && <form onSubmit={(event: FormEvent) => { event.preventDefault(); void action.run(() => mtApi.updateProgress(ticket.id, progress, notes), () => action.setSuccess('Đã cập nhật tình trạng bảo trì.')); }}><div className="mt-progress-submit"><Field label="Ghi chú cho Đơn vị vận hành"><input required maxLength={1000} placeholder="Mô tả công việc đã thực hiện hoặc lý do chờ linh kiện…" value={notes} onChange={e => setNotes(e.target.value)} /></Field><Button type="submit" disabled={action.pending}>{action.pending ? 'Đang lưu…' : progress === 'DONE' ? 'Xác nhận hoàn tất' : 'Lưu cập nhật'}</Button></div></form>}
    <Feedback action={action} />{resource.status === 'PENDING_CHECK' && <Notice tone="neutral">Trong demo, phát phản hồi cảm biến từ <Link to="/setup">điều khiển demo</Link> để xác minh trạng thái tiếp theo.</Notice>}
  </section>;
}
