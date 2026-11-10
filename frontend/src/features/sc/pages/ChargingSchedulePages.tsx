import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './charging-schedule.css';

type Schedule = { priority:number; vehicle:string; hub:string; battery:number; demand:string; charger:string; start:string; end:string; };
const initial:Schedule[] = [
 {priority:1,vehicle:'UG-040',hub:'KTX Khu A',battery:14,demand:'Đã đặt 12:30',charger:'#01',start:'10:00',end:'11:30'},
 {priority:2,vehicle:'UG-122',hub:'Ga Metro ĐHQG',battery:18,demand:'Cao điểm 17:00',charger:'#02',start:'10:00',end:'11:40'},
 {priority:3,vehicle:'UG-047',hub:'KTX Khu A',battery:27,demand:'Dự báo cao 13:00',charger:'#05',start:'10:15',end:'11:30'},
 {priority:4,vehicle:'UG-063',hub:'Thư viện TT',battery:31,demand:'Trung bình',charger:'#03',start:'11:00',end:'12:10'},
 {priority:5,vehicle:'UG-022',hub:'KTX Khu A',battery:38,demand:'Trung bình',charger:'#02',start:'11:45',end:'12:40'},
 {priority:6,vehicle:'UG-150',hub:'Nhà văn hóa SV',battery:39,demand:'Thấp',charger:'#01',start:'12:00',end:'13:00'},
 {priority:7,vehicle:'UG-131',hub:'KTX Khu B',battery:22,demand:'Cao điểm 17:00',charger:'—',start:'',end:''},
 {priority:8,vehicle:'UG-140',hub:'Ga Metro',battery:19,demand:'Cao điểm 17:00',charger:'—',start:'',end:''},
];
const mins=(t:string)=>{const [h,m]=t.split(':').map(Number);return h*60+m};
function Battery({value}:{value:number}){return <div className="sc-battery"><span><i style={{width:value+'%',background:value<20?'#b42318':value<35?'#f59e0b':'#5b8def'}}/></span><b className={value<20?'low':value<35?'mid':''}>{value}%</b></div>}
function Header({title,sub,children}:{title:string;sub:string;children?:React.ReactNode}){return <div className="sc-heading"><div><h1>{title}</h1><p>{sub}</p></div>{children&&<div className="sc-heading-actions">{children}</div>}</div>}
function Pill({children,tone='blue'}:{children:React.ReactNode;tone?:string}){return <span className={'sc-pill sc-pill--'+tone}>{children}</span>}

export function ChargingSchedulePage(){
 const [rows]=useState(initial); const [hub,setHub]=useState('Tất cả Hub');const [range,setRange]=useState('10:00 – 14:00');const [showCreate,setShowCreate]=useState(false);const [confirmed,setConfirmed]=useState(false);
 const [newHub,setNewHub]=useState('Tất cả Hub');
 const unanswered=rows.filter(r=>r.charger==='—').length;
 const scheduled=rows.filter(r=>r.charger!=='—');
 const filtered=rows.filter(r=>hub==='Tất cả Hub'||r.hub===hub);
 const create=()=>{setShowCreate(false);setConfirmed(false);};
 return <div className="sc-page"><Header title="Lập lịch sạc thông minh" sub="Ưu tiên theo mức pin, nhu cầu sử dụng sắp tới và năng lực cổng sạc khả dụng"><select value={hub} onChange={e=>setHub(e.target.value)}><option>Tất cả Hub</option><option>KTX Khu A</option><option>KTX Khu B</option><option>Ga Metro ĐHQG</option></select><select value={range} onChange={e=>setRange(e.target.value)}><option>10:00 – 14:00</option><option>14:00 – 18:00</option><option>18:00 – 22:00</option></select><button className="sc-primary" onClick={()=>setShowCreate(true)}>⚡ Tạo lịch</button></Header>
 <div className="sc-kpis"><article><span>Xe có nhu cầu sạc</span><b>18 xe</b><small>Pin &lt; 40% hoặc có đặt sẵn tới</small></article><article><span>Cổng sạc khả dụng</span><b>22 cổng</b><small>6 Hub · 3 cổng lỗi đã loại</small></article><article><span>Đã xếp lịch</span><b>{scheduled.length+9} xe</b><small className="green">Hoàn tất trước cao điểm 17:00</small></article><article><span>Chưa đáp ứng</span><b className="orange">{unanswered} yêu cầu</b><small className="orange">Không đủ cổng trong khung giờ</small></article></div>
 <section className="sc-panel"><div className="sc-panel-title"><div><h2>Lịch sạc đề xuất</h2><p>Bản nháp do hệ thống tính toán · chờ Đơn vị vận hành xác nhận</p></div>{confirmed&&<Pill tone="green">Đã xác nhận lịch sạc</Pill>}</div>
 <div className="sc-table-scroll"><table className="sc-table"><thead><tr><th>ƯU TIÊN</th><th>XE</th><th>HUB</th><th>PIN HIỆN TẠI</th><th>NHU CẦU SẮP TỚI</th><th>CỔNG</th><th>KHUNG GIỜ</th></tr></thead><tbody>{filtered.map(r=><tr key={r.vehicle}><td><Pill tone={r.priority<3?'red':r.priority<5?'yellow':'blue'}>{r.charger==='—'?'—':r.priority}</Pill></td><td>{r.vehicle}</td><td>{r.hub}</td><td><Battery value={r.battery}/></td><td>{r.demand}</td><td className={r.charger==='—'?'red-text':''}>{r.charger}</td><td>{r.charger==='—'?<Pill tone="yellow">Chưa đáp ứng</Pill>:r.start+' – '+r.end}</td></tr>)}</tbody></table></div>
 <div className="sc-panel-footer"><div className="sc-warning"> {unanswered? '⚠ '+rows.filter(r=>r.charger==='—').map(r=>r.vehicle+' ('+r.hub+')').join(' và ')+' chưa được đáp ứng: hết cổng tương thích trong khung giờ.':'✓ Tất cả yêu cầu đã được xếp lịch.'}</div><div className="sc-footer-actions"><Link className="sc-secondary" to="/charging-schedules/adjust">Điều chỉnh (SC02)</Link><button className="sc-primary" onClick={()=>setConfirmed(true)} disabled={confirmed}>{confirmed?'Đã xác nhận':'Xác nhận lịch sạc'}</button></div></div></section>
 {showCreate&&<div className="sc-modal-backdrop"><section className="sc-modal"><h2>Tạo lịch sạc thông minh</h2><p>Hệ thống sẽ tính toán lịch dựa trên mức pin, nhu cầu và công suất cổng sạc.</p><label>Phạm vi Hub<select value={newHub} onChange={e=>setNewHub(e.target.value)}><option>Tất cả Hub</option><option>KTX Khu A</option><option>KTX Khu B</option></select></label><label>Khung giờ<select><option>10:00 – 14:00</option><option>14:00 – 18:00</option></select></label><div className="sc-modal-actions"><button className="sc-secondary" onClick={()=>setShowCreate(false)}>Hủy</button><button className="sc-primary" onClick={create}>Tính toán lịch</button></div></section></div>}
 </div>;
}

export function AdjustChargingSchedulePage(){
 const [selected,setSelected]=useState('UG-047');const [charger,setCharger]=useState('#05');const [start,setStart]=useState('12:00');const [end,setEnd]=useState('13:15');const [priority,setPriority]=useState('2');const [saved,setSaved]=useState(false);
 const rows=useMemo(()=>[
  {port:'#01',vehicle:'UG-040',from:'10:00',to:'11:30',tone:'red'},
  {port:'#01',vehicle:'UG-150',from:'12:00',to:'13:00',tone:'blue'},
  {port:'#02',vehicle:'UG-122',from:'10:00',to:'11:40',tone:'red'},
  {port:'#02',vehicle:'UG-022',from:'11:45',to:'12:40',tone:'blue'},
  {port:'#03',vehicle:'UG-063',from:'11:00',to:'12:10',tone:'yellow'},
  {port:'#04',vehicle:'Báo lỗi E-CHG-02 – không xếp lịch',from:'10:00',to:'14:00',tone:'fault'},
  {port:'#05',vehicle:'vị trí cũ 10:15',from:'10:15',to:'11:30',tone:'old'},
  {port:'#05',vehicle:'UG-047',from:start,to:end,tone:'selected'},
  {port:'#05',vehicle:'UG-018',from:'13:30',to:'14:00',tone:'blue'},
  {port:'#06',vehicle:'59-X1 222.10',from:'10:00',to:'10:40',tone:'muted'},
 ],[start,end]);
 const lanes=['#01','#02','#03','#04','#05','#06']; const timeX=(t:string)=>Math.max(0,Math.min(100,(mins(t)-600)/240*100)); const width=(a:string,b:string)=>Math.max(4,(mins(b)-mins(a))/240*100);
 const conflict=mins(start)>=mins(end)||mins(start)<600||mins(end)>840;
 const save=()=>{setSaved(true);};
 return <div className="sc-page"><Header title="Điều chỉnh lịch sạc · KTX Khu A" sub="Lịch #LS-0710-03 đang áp dụng · kéo thả hoặc sửa trực tiếp thời điểm / thứ tự ưu tiên"><Link className="sc-secondary sc-back" to="/charging-schedules">← Quay lại lịch đề xuất</Link></Header>
 <div className="sc-adjust-layout"><section className="sc-timeline"><div className="sc-time-head"><span/><b>10:00</b><b>11:00</b><b>12:00</b><b>13:00</b><b>14:00</b></div><div className="sc-lanes">{lanes.map(l=><div className="sc-lane" key={l}><strong>Cổng {l}</strong><div className="sc-lane-track">{[0,1,2,3,4].map(n=><i className="sc-hour-line" style={{left:n*25+'%'}} key={n}/>)}{rows.filter(r=>r.port===l).map((r,i)=><button key={i} className={'sc-block sc-block--'+r.tone} style={{left:timeX(r.from)+'%',width:width(r.from,r.to)+'%'}} onClick={()=>{if(r.vehicle.startsWith('UG-'))setSelected(r.vehicle);}}><b>{r.vehicle}</b>{r.tone==='selected'&&<small>{start} – {end} (mới)</small>}</button>)}</div></div>)}</div></section>
 <aside className="sc-editor"><h2>Điều chỉnh {selected}</h2><p>Pin 27% · nhu cầu dự báo cao 13:00</p><label>Cổng sạc<select value={charger} onChange={e=>setCharger(e.target.value)}><option>#05 · Type 2 · 3.3 kW</option><option>#03 · Type 2 · 7.4 kW</option><option>#06 · Type 2 · 7.4 kW</option></select></label><div className="sc-two-fields"><label>Bắt đầu<input type="time" value={start} onChange={e=>{setStart(e.target.value);setSaved(false);}}/></label><label>Kết thúc<input type="time" value={end} onChange={e=>{setEnd(e.target.value);setSaved(false);}}/></label></div><label>Thứ tự ưu tiên<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="1">1 (trước: 2)</option><option value="2">2 (trước: 3)</option><option value="3">3 (trước: 4)</option><option value="4">4 (trước: 5)</option></select></label><h3>Kiểm tra với năng lực cổng sạc</h3><div className={conflict?'sc-check sc-check--bad':'sc-check'}>{conflict?'⚠ Khung giờ không hợp lệ. Vui lòng chọn thời gian trong 10:00–14:00.':'✓ Không xung đột: cổng '+charger+' trống '+start+' – '+end+', tổng công suất Hub trong giới hạn.'}</div><h3>Thay đổi so với lịch hiện tại</h3><div className="sc-change"><span>{selected} khung giờ</span><b>10:15 → {start}</b></div><div className="sc-change"><span>{selected} ưu tiên</span><b>3 → {priority}</b></div><div className="sc-note">{saved?'Đã lưu thay đổi vào bản nháp lịch sạc.':'Lỗi lưu lịch → giữ nguyên lịch cũ và thông báo.'}</div><div className="sc-editor-actions"><button className="sc-secondary" onClick={()=>{setStart('10:15');setEnd('11:30');setPriority('3');setSaved(false);}}>Hoàn tác</button><button className="sc-primary" disabled={conflict} onClick={save}>Xác nhận thay đổi</button></div></aside></div>
 </div>;
}
