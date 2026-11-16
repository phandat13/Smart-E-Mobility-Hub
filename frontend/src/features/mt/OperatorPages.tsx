import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { mtApi } from '../../api/mtApi';
import { useDemoState } from '../../mocks/store';
import { date, priorityLabel, progressLabel, resourceLabel, resourceTitle, time } from '../../shared/format';
import type { DemoState } from '../../shared/types';
import { Badge, Button, Empty, Feedback, Field, Notice, useAction } from '../../shared/ui';
import OrderDialog from './OrderDialog';
import './mt.css';

const PAGE_SIZE = 7;
type Queued = DemoState['incidents'][number];
function queueStatus(incident: Queued, state: DemoState) {
  if (incident.acceptedAt) return 'Đã đóng';
  if (incident.status === 'CLOSED') return 'Chờ xác nhận';
  if (incident.status === 'ASSIGNED') return 'Đang xử lý';
  return state.resources.find(r => r.id === incident.resourceId)?.status === 'FAULTY' ? 'Đã tiếp nhận' : 'Chờ xác nhận';
}
const priorityTone = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' } as const;
const sourceShort = (incident: Queued) => incident.source === 'SYSTEM' ? 'Hệ thống' : 'SV báo cáo';

export function IncidentQueuePage() {
  const state = useDemoState(); const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? ''); const [page, setPage] = useState(1);
  useEffect(() => { setSearch(params.get('q') ?? ''); setPage(1); }, [params]);
  const [selected, setSelected] = useState(state.incidents[0]?.id ?? ''); const [assigning, setAssigning] = useState(false); const [message, setMessage] = useState('');
  const query = search.trim().toLocaleLowerCase('vi');
  const filtered = state.incidents.filter(i => `${i.id} ${i.resourceId} ${i.category} ${i.description}`.toLocaleLowerCase('vi').includes(query)).sort((a, b) => ['HIGH', 'MEDIUM', 'LOW'].indexOf(a.priority) - ['HIGH', 'MEDIUM', 'LOW'].indexOf(b.priority));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const incident = state.incidents.find(i => i.id === selected);
  return <div className="mt-operator" data-figma-node="15:1578"><div className="ui-page-heading"><h1>Hàng đợi sự cố & phân công bảo trì</h1><Link className="ui-button ui-button--primary" to="/maintenance/orders/new">🛠 Tạo lệnh bảo trì</Link></div>{message && <Notice tone="success" role="status">{message}</Notice>}
    <div className="mt-queue-layout"><section className="ui-panel mt-queue"><h2>Hàng đợi phiếu sự cố · theo mức ưu tiên</h2><p className="ui-subtitle">Phiếu từ sinh viên/tài xế (MT01) và cảnh báo hệ thống; sắp xếp theo mức ảnh hưởng tới Hub</p>
      <label className="mt-search"><span aria-hidden="true">⌕</span><input aria-label="Tìm phiếu sự cố" placeholder="Tìm theo mã ticket hoặc nội dung" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      {!filtered.length ? <Empty title="Không có phiếu phù hợp">Thử thay đổi từ khóa tìm kiếm.</Empty> : <><div className="ui-table-wrap"><table className="ui-table mt-queue-table"><thead><tr><th>MÃ TICKET</th><th>MÔ TẢ SỰ CỐ</th><th>MỨC ĐỘ</th><th>TRẠNG THÁI</th></tr></thead><tbody>{visible.map(i => <tr className={selected === i.id ? 'mt-row-selected' : ''} key={i.id} onClick={() => setSelected(i.id)}><td><button type="button" className="mt-text-button" onClick={() => setSelected(i.id)} aria-label={`Xem phiếu ${i.id}`} aria-pressed={selected === i.id}>#{i.id}</button></td><td className="mt-queue-description">{i.resourceId} {i.category.toLocaleLowerCase('vi')} ({sourceShort(i)})</td><td><Badge tone={priorityTone[i.priority]}>{priorityLabel[i.priority]}</Badge></td><td className="mt-queue-status">{queueStatus(i, state)}</td></tr>)}</tbody></table></div>
        <div className="mt-pagination"><span>Hiển thị {visible.length} trên {filtered.length} ticket</span><nav aria-label="Phân trang hàng đợi"><button type="button" aria-label="Trang trước" disabled={current === 1} onClick={() => setPage(current - 1)}>‹</button>{Array.from({ length: pages }, (_, index) => <button type="button" key={index} aria-current={current === index + 1 ? 'page' : undefined} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button type="button" aria-label="Trang sau" disabled={current === pages} onClick={() => setPage(current + 1)}>›</button></nav></div></>}
    </section><aside className="ui-panel mt-ticket-panel">{incident ? <IncidentDetail key={incident.id} incident={incident} assign={() => setAssigning(true)} accepted={() => setMessage(`Đã nghiệm thu và đóng phiếu ${incident.id}.`)} /> : <Empty title="Chọn một phiếu để xem chi tiết" />}</aside></div>
    {assigning && incident && <OrderDialog resourceIds={[incident.resourceId]} incidentId={incident.id} close={() => setAssigning(false)} created={id => { setAssigning(false); setMessage(`Đã tạo lệnh ${id} và phân công kỹ thuật viên.`); }} />}
  </div>;
}

function IncidentDetail({ incident, assign, accepted }: { incident: Queued; assign: () => void; accepted: () => void }) {
  const state = useDemoState(); const action = useAction(); const notesAction = useAction(); const [notes, setNotes] = useState(incident.notes ?? ''); const [saved, setSaved] = useState(false);
  const resource = state.resources.find(r => r.id === incident.resourceId); const hub = state.hubs.find(h => h.id === incident.hubId);
  const order = state.orders.find(o => o.id === incident.orderId); const technician = state.technicians.find(t => t.id === incident.technicianId);
  const ticket = state.tickets.find(t => t.orderId === incident.orderId && t.resourceId === incident.resourceId);
  const status = queueStatus(incident, state);
  const steps: { title: string; detail: string }[] = [{ title: 'Ticket được tạo', detail: `${time(incident.createdAt)} · ${incident.source === 'SYSTEM' ? 'Hệ thống' : 'Sinh viên báo cáo'}` }];
  if (order) steps.push({ title: 'Đã phân công', detail: `${time(order.createdAt)} · ${technician?.name ?? '—'}` });
  if (ticket) steps.push({ title: ticket.progress === 'DONE' ? 'Sửa chữa hoàn tất' : ticket.progress === 'UNREPAIRABLE' ? 'Ngừng sử dụng tài nguyên' : 'Đang kiểm tra thiết bị', detail: `${time(ticket.timeline[ticket.timeline.length - 1].at)} · ${ticket.progress === 'DONE' || ticket.progress === 'UNREPAIRABLE' ? progressLabel[ticket.progress] : 'Đang thực hiện'}` });
  if (incident.acceptedAt) steps.push({ title: 'Nghiệm thu & đóng phiếu', detail: `${time(incident.acceptedAt)} · Đơn vị vận hành` });
  const canAssign = incident.status === 'OPEN' && resource?.status === 'FAULTY';
  const canAccept = incident.status === 'CLOSED' && !incident.acceptedAt && !!resource && !['FAULTY', 'MAINTENANCE_LOCKED', 'PENDING_CHECK'].includes(resource.status);
  return <><h2>Chi tiết Ticket #{incident.id}</h2><div className="mt-ticket-pills"><Badge tone={priorityTone[incident.priority]}>Mức {priorityLabel[incident.priority].toLocaleLowerCase('vi')}</Badge><Badge tone={status === 'Đã đóng' ? 'green' : 'blue'}>{status}</Badge></div>
    <div className="mt-ticket-info"><p className="ui-eyebrow">THÔNG TIN SỰ CỐ</p><h3>{incident.category}</h3><ul><li>Thiết bị: {resource ? resourceTitle(resource) : incident.resourceId}</li><li>Khu vực: {hub?.shortName ?? '—'}</li><li>Phát hiện: {time(incident.createdAt)} · {date(incident.createdAt)}</li><li>Người phụ trách: {technician?.name ?? 'Chưa phân công'}</li><li>Nguồn: {incident.source === 'SYSTEM' ? 'Hệ thống giám sát' : 'Sinh viên báo cáo (MT01)'}</li></ul><p className="mt-description">{incident.description}</p>{!!incident.photos.length && <div className="mt-photo-list">{incident.photos.map((photo, index) => <a key={index} href={photo} target="_blank" rel="noreferrer"><img src={photo} alt={`Ảnh báo cáo ${index + 1}`} /></a>)}</div>}</div>
    <p className="ui-eyebrow mt-ticket-label">TIẾN TRÌNH XỬ LÝ</p><ol className="mt-ticket-steps">{steps.map(step => <li key={step.title}><strong>{step.title}</strong><small>{step.detail}</small></li>)}</ol>
    <label className="mt-ticket-notes"><span className="ui-eyebrow mt-ticket-label">GHI CHÚ XỬ LÝ</span><textarea rows={3} maxLength={1000} placeholder="Ghi chú cho các bước xử lý tiếp theo…" value={notes} onChange={e => { setNotes(e.target.value); setSaved(false); }} onBlur={() => { if (notes.trim() !== (incident.notes ?? '')) void notesAction.run(() => mtApi.saveIncidentNotes(incident.id, notes), () => setSaved(true)); }} /></label>{saved && <small className="mt-saved" role="status">Đã lưu ghi chú</small>}
    <Feedback action={notesAction} /><Feedback action={action} />
    {incident.status === 'OPEN' && resource?.status !== 'FAULTY' && <Notice tone="warning">Tài nguyên đang được sử dụng hoặc đã bị khóa. Chỉ tạo lệnh khi tài nguyên ở trạng thái Báo lỗi.</Notice>}
    {incident.status === 'CLOSED' && !canAccept && !incident.acceptedAt && <Notice tone="neutral">Đã sửa chữa xong. Nghiệm thu sau khi dữ liệu cảm biến xác minh tài nguyên.</Notice>}
    <div className="mt-ticket-actions"><Button disabled={!canAssign} onClick={assign}>Tạo phiếu & phân công KTV</Button><Button tone="secondary" disabled={!canAccept || action.pending} onClick={() => void action.run(() => mtApi.acceptIncident(incident.id), accepted)}>Nghiệm thu & đóng phiếu</Button></div></>;
}

export function ResourceMaintenancePage() {
  const state = useDemoState(); const [selected, setSelected] = useState<string[]>([]); const [open, setOpen] = useState(false); const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const resources = state.resources.filter(r => r.status !== 'AVAILABLE' && `${r.id} ${r.description}`.toLowerCase().includes(query.toLowerCase()));
  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  return <div className="mt-operator" data-figma-node="400:2739"><div className="ui-page-heading"><div><h1>Cảnh báo xe / thiết bị lỗi</h1><p>Hệ thống tự động phân tích dữ liệu cảm biến và chuyển tài nguyên lỗi sang “Báo lỗi”</p></div><Link className="ui-link" to="/maintenance">← Hàng đợi sự cố</Link></div>{message && <Notice tone="success" role="status">{message}</Notice>}<section className="ui-panel"><div className="ui-page-heading"><Field label="Tìm tài nguyên"><input className="ui-input" placeholder="Mã xe, cổng sạc hoặc mô tả" value={query} onChange={e => setQuery(e.target.value)} /></Field><Button disabled={!selected.length} onClick={() => setOpen(true)}>Tạo lệnh bảo trì ({selected.length})</Button></div>
    {!resources.length ? <Empty title="Không có tài nguyên lỗi phù hợp" /> : <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th><span className="sr-only">Chọn tài nguyên</span></th><th>TÀI NGUYÊN</th><th>MÃ LỖI</th><th>MÔ TẢ</th><th>HUB</th><th>TRẠNG THÁI</th></tr></thead><tbody>{resources.map(r => <tr key={r.id}><td><input type="checkbox" aria-label={`Chọn ${r.id}`} checked={selected.includes(r.id)} disabled={r.status !== 'FAULTY'} onChange={() => toggle(r.id)} /></td><td><strong>{r.kind === 'PORT' ? r.name : r.id}</strong></td><td>{r.errorCode || '—'}</td><td>{r.description}</td><td>{r.kind === 'VEHICLE' && r.status === 'IN_USE' ? 'Đang trong chuyến đi' : state.hubs.find(h => h.id === r.hubId)?.shortName}</td><td><Badge tone={r.status === 'FAULTY' ? 'red' : r.status === 'AVAILABLE' ? 'green' : 'blue'}>{resourceLabel[r.status]}</Badge></td></tr>)}</tbody></table></div>}
    <Notice tone="neutral">Xe đang trong chuyến đi, tài nguyên chờ kiểm tra hoặc đã thuộc lệnh khác không được chọn.</Notice></section><OrderList />{open && <OrderDialog resourceIds={selected} close={() => setOpen(false)} created={id => { setOpen(false); setSelected([]); setMessage(`Đã tạo lệnh ${id}. Tài nguyên đã chuyển sang Khóa bảo trì.`); }} />}</div>;
}

export function OrderList() {
  const state = useDemoState();
  return <section className="ui-panel mt-order-list"><h2>Lệnh bảo trì</h2>{!state.orders.length ? <p className="ui-subtitle">Chưa có lệnh. Phân công một phiếu sự cố hoặc chọn tài nguyên để tạo lệnh mới.</p> : <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>MÃ LỆNH</th><th>TÀI NGUYÊN</th><th>KỸ THUẬT VIÊN</th><th>HẠN XỬ LÝ</th><th>TRẠNG THÁI</th></tr></thead><tbody>{state.orders.map(order => <tr key={order.id}><td>{order.id}</td><td>{order.resourceIds.join(', ')}</td><td>{state.technicians.find(t => t.id === order.technicianId)?.name}</td><td>{time(order.dueAt)} · {date(order.dueAt)}</td><td><Badge tone={order.status === 'CLOSED' ? 'green' : 'amber'}>{order.status === 'CLOSED' ? 'Đã đóng' : 'Đang xử lý'}</Badge></td></tr>)}</tbody></table></div>}</section>;
}
