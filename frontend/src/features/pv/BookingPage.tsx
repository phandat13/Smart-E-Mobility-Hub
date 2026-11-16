import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pvApi } from '../../api/pvApi';
import { useDemoState } from '../../mocks/store';
import { atVietnam, dayInput, dayMonth, money, serviceLabel, shortConnector } from '../../shared/format';
import type { ServiceType } from '../../shared/types';
import { Badge, Button, DateInput, Empty, Feedback, Field, Notice, Summary, TimeSelect, useAction } from '../../shared/ui';
import { estimate, isActiveBooking, resourceAvailable } from './domain';
import './pv.css';

export default function BookingPage() {
  const state = useDemoState(); const action = useAction(); const navigate = useNavigate();
  const [hubId, setHubId] = useState(state.hubs[0].id);
  const [vehicleId, setVehicleId] = useState(state.vehicles.find(v => !state.bookings.some(b => b.vehicleId === v.id && isActiveBooking(b)))?.id ?? state.vehicles[0]?.id ?? '');
  const [service, setService] = useState<ServiceType>('BOTH');
  const [day, setDay] = useState(dayInput(state.now)); const [start, setStart] = useState('16:00'); const [end, setEnd] = useState('18:00');
  const [slot, setSlot] = useState(''); const [port, setPort] = useState('');
  const hub = state.hubs.find(h => h.id === hubId)!; const vehicle = state.vehicles.find(v => v.id === vehicleId);
  const validTime = Boolean(day && start && end && end > start);
  const startAt = validTime ? atVietnam(day, start) : state.now; const endAt = validTime ? atVietnam(day, end) : state.now;
  const slots = hub.slots.filter(id => validTime && resourceAvailable(state, hub.id, 'slot', id, startAt, endAt));
  const ports = hub.ports.filter(p => p.connector === vehicle?.connector && validTime && resourceAvailable(state, hub.id, 'port', p.id, startAt, endAt) && !state.resources.some(r => r.kind === 'PORT' && r.hubId === hub.id && r.name === `Cổng #${p.id}` && r.status !== 'AVAILABLE'));
  const slotKey = slots.join(','); const portKey = ports.map(p => p.id).join(',');
  useEffect(() => { setSlot(previous => slots.includes(previous) ? previous : slots[0] ?? ''); }, [hubId, slotKey]); // Availability changes invalidate a stale selection.
  useEffect(() => { setPort(previous => ports.some(p => p.id === previous) ? previous : ports[0]?.id ?? ''); }, [hubId, vehicleId, portKey]);
  function submit(event: FormEvent) { event.preventDefault(); void action.run(() => pvApi.book({ vehicleId, hubId, service, startAt, endAt, slotId: slot, portId: port }), id => navigate(`/pv/bookings/${id}/qr`)); }
  if (!state.vehicles.length) return <main className="pv-page ui-panel"><Empty title="Thêm phương tiện trước khi đặt chỗ" to="/pv/vehicles" action="Thêm phương tiện">Thông tin xe giúp tìm cổng sạc tương thích.</Empty></main>;
  return <main className="pv-page pv-book-page" data-figma-node="15:1213"><div className="ui-page-heading"><div><p className="ui-eyebrow">ĐẶT CHỖ XE CÁ NHÂN</p><h1>Đặt chỗ đỗ & lịch sạc, an tâm đến Hub.</h1></div></div>
    <ol className="pv-steps" aria-label="Các bước đặt chỗ"><li><span>✓</span>Thông tin đặt chỗ</li><li aria-current="step"><span>2</span><strong>Chọn vị trí khả dụng</strong></li><li><span>3</span>Xác nhận & nhận mã QR</li></ol>
    <form className="pv-book-layout" onSubmit={submit}><section className="ui-panel pv-book-form">
      <div className="ui-grid-2"><Field label="Hub điểm đến"><select value={hubId} onChange={e => setHubId(e.target.value)}>{state.hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field><Field label="Phương tiện cá nhân"><select value={vehicleId} onChange={e => setVehicleId(e.target.value)}>{state.vehicles.map(v => <option key={v.id} value={v.id}>{v.model || 'Xe cá nhân'} · {v.plate}</option>)}</select></Field></div>
      <fieldset className="pv-fieldset"><legend>Loại dịch vụ</legend><div className="ui-grid-3">{(['PARK', 'CHARGE', 'BOTH'] as const).map((item, i) => <button className="ui-choice" type="button" aria-pressed={service === item} key={item} onClick={() => setService(item)}>{['🅿️ Chỉ đỗ xe', '⚡ Chỉ sạc xe', '🅿️⚡ Cả hai'][i]}</button>)}</div></fieldset>
      <div className="ui-grid-3"><Field label="Ngày"><DateInput label="Ngày" min={dayInput(state.now)} value={day} onChange={setDay} /></Field><Field label="Từ"><TimeSelect label="Từ" value={start} onChange={setStart} /></Field><Field label="Đến"><TimeSelect label="Đến" value={end} onChange={setEnd} /></Field></div>
      <div className="pv-availability"><div className="pv-availability__heading"><h2>Vị trí khả dụng trong khung {start} – {end}</h2><Badge tone="amber">Nhu cầu dự kiến: Trung bình</Badge></div>
        {!validTime ? <Notice tone="error">Chọn ngày và khung giờ hợp lệ, giờ kết thúc phải sau giờ bắt đầu.</Notice> : <>
          <h3>{service === 'CHARGE' ? 'Vị trí đỗ tại cổng sạc' : 'Chỗ đỗ'}</h3><div className="pv-slots">{hub.slots.map(id => <button type="button" key={id} className="pv-slot" aria-pressed={slot === id && slots.includes(id)} disabled={!slots.includes(id)} onClick={() => setSlot(id)}><strong>{id}</strong><small>{slots.includes(id) ? 'Trống' : 'Không khả dụng'}</small></button>)}</div>
          {service !== 'PARK' && <><h3>Cổng sạc tương thích ({vehicle?.connector})</h3><div className="pv-ports">{hub.ports.filter(p => p.connector === vehicle?.connector).map(p => <button type="button" key={p.id} className="pv-port" aria-pressed={port === p.id && ports.some(item => item.id === p.id)} disabled={!ports.some(item => item.id === p.id)} onClick={() => setPort(p.id)}><strong>🔌 Cổng #{p.id}</strong><small>{shortConnector(p.connector)} · {p.power} kW</small></button>)}</div></>}
          {(!slots.length || service !== 'PARK' && !ports.length) && <Notice tone="warning">Hub hết chỗ hoặc không có cổng sạc tương thích. Hãy chọn Thư viện Trung tâm, Hub lân cận hoặc khung giờ khác.</Notice>}
        </>}
        <Notice tone="neutral">Hub hết chỗ hoặc hết cổng sạc tương thích → hệ thống gợi ý Hub lân cận hoặc khung giờ khả dụng khác.</Notice>
      </div>
    </section><aside className="ui-panel pv-book-summary"><h2>Tóm tắt đặt chỗ</h2><Summary rows={[
      ['Hub', hub.shortName], ['Phương tiện', vehicle?.plate ?? '—'], ['Dịch vụ', serviceLabel[service]], ['Thời gian', validTime ? `${start} – ${end}, ${dayMonth(startAt)}` : '—'], ['Chỗ đỗ', slot || '—'], ...(service !== 'PARK' ? [['Cổng sạc', port && vehicle ? `#${port} · ${shortConnector(vehicle.connector)}` : '—'] as [string, string]] : []), ['Chi phí ước tính', <span className="pv-primary">{validTime ? money(estimate(service, startAt, endAt)) : '—'}</span>],
    ]} /><Notice tone="warning">Check-in trước giờ hẹn hoặc trễ tối đa 15 phút. Quá hạn, lượt đặt tự hủy và tài nguyên được kiểm tra lại trước khi mở cho người khác.</Notice><Feedback action={action} /><Button type="submit" className="pv-full" disabled={action.pending || !validTime || !slot || service !== 'PARK' && !port}>{action.pending ? 'Đang xác nhận…' : 'Xác nhận đặt chỗ'}</Button><Link className="ui-link pv-summary-link" to="/pv/sessions">Xem các phiên đã đặt →</Link></aside></form>
  </main>;
}
