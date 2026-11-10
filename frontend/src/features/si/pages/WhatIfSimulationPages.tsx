import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './what-if.css';

type ScenarioKind = 'Đột biến tải' | 'Đứt gãy hạ tầng' | 'Điều chuyển tái cân bằng' | 'Phân bổ năng lực trạm sạc';
const kinds: {name:ScenarioKind;desc:string;icon:string}[]=[
 {name:'Đột biến tải',desc:'Ga Metro, KTX – tan học, tàu cập ga',icon:'📈'},
 {name:'Đứt gãy hạ tầng',desc:'Hỏng cổng sạc, cúp điện, hỏng xe hàng loạt',icon:'⚡'},
 {name:'Điều chuyển tái cân bằng',desc:'Thử nghiệm các lệnh điều chuyển',icon:'⇄'},
 {name:'Phân bổ năng lực trạm sạc',desc:'Thay đổi số cổng / công suất sạc',icon:'🔌'},
];
const savedScenarios=[
 {name:'Cúp điện KTX A (2h)',detail:'Đứt gãy hạ tầng · 06/10'},
 {name:'Tái cân bằng sáng thứ 2',detail:'Điều chuyển · 04/10'},
 {name:'Thi cuối kỳ – Thư viện',detail:'Đột biến tải · 01/10'},
];
function SIHeader({title,sub,children}:{title:string;sub:string;children?:ReactNode}){return <div className="si-heading"><div><h1>{title}</h1><p>{sub}</p></div>{children}</div>}
function SIStat({label,value,detail,tone=''}:{label:string;value:string;detail:string;tone?:string}){return <article className="si-stat"><span>{label}</span><b className={tone}>{value}</b><small className={tone}>{detail}</small></article>}
function Tag({children,tone='blue'}:{children:ReactNode;tone?:string}){return <span className={'si-tag si-tag--'+tone}>{children}</span>}

export function WhatIfScenarioPage(){
 const [kind,setKind]=useState<ScenarioKind>('Đột biến tải');
 const [hubs,setHubs]=useState(['Ga Metro ĐHQG','KTX Khu A','KTX Khu B']);
 const [increase,setIncrease]=useState(60);
 const [duration,setDuration]=useState('60 phút');
 const [name,setName]=useState('Tan học + tàu Metro cập ga 17h');
 const [description,setDescription]=useState('Kiểm tra khả năng đáp ứng khi nhu cầu tăng 60% tại 3 Hub cửa ngõ.');
 const [notice,setNotice]=useState('');
 const navigate=useNavigate();
 const toggleHub=(h:string)=>setHubs(old=>old.includes(h)?old.filter(x=>x!==h):[...old,h]);
 const save=()=>{setNotice('Đã lưu cấu hình kịch bản vào danh sách kịch bản của bạn.');};
 const run=()=>navigate('/simulations/SIM-0710-05/results');
 return <div className="si-page"><SIHeader title="Tạo kịch bản What-if" sub="Mô phỏng chạy trên bản sao trạng thái (snapshot) – tách biệt hoàn toàn dữ liệu vận hành thật"/>
 <div className="si-create-grid"><section className="si-card si-config"><h2>1. Loại tình huống</h2><div className="si-kind-grid">{kinds.map(k=><button key={k.name} className={'si-kind'+(kind===k.name?' is-selected':'')} onClick={()=>setKind(k.name)}><span>{k.icon}</span><div><b>{k.name}</b><small>{k.desc}</small></div></button>)}</div>
 <h2 className="si-section-gap">2. Tham số tình huống</h2><label className="si-field-label">Hub áp dụng</label><div className="si-hub-chips">{['Ga Metro ĐHQG','KTX Khu A','KTX Khu B','Thư viện TT','Tòa VNU'].map(h=><button key={h} className={hubs.includes(h)?'si-chip active':'si-chip'} onClick={()=>toggleHub(h)}>{h}{hubs.includes(h)?' ×':''}</button>)}<span className="si-chip si-chip--muted">+ Chọn Hub</span></div>
 <div className="si-slider-label"><b>Mức tăng nhu cầu thuê/trả</b><strong>+{increase}%</strong></div><input className="si-range" type="range" min="0" max="100" step="5" value={increase} onChange={e=>setIncrease(Number(e.target.value))}/>
 <div className="si-param-grid"><label>Thời điểm bắt đầu<input type="datetime-local" defaultValue="2026-10-07T17:00"/></label><div><span className="si-field-label">Khung thời gian mô phỏng</span><div className="si-duration">{['15 phút','30 phút','60 phút','24 giờ'].map(d=><button key={d} className={duration===d?'active':''} onClick={()=>setDuration(d)}>{d}</button>)}</div></div></div>
 <div className="si-param-grid"><label>Giả định bổ sung<select><option>Cổng #04 KTX A tiếp tục lỗi</option><option>Không có sự cố bổ sung</option><option>Mất điện tại Ga Metro</option></select></label><label>Dữ liệu đầu vào<select><option>Snapshot trạng thái hiện tại</option><option>Snapshot lúc 16:45</option></select></label></div>
 <div className="si-valid">✓ Cấu hình hợp lệ và nằm trong phạm vi mô phỏng. Tham số không hợp lệ hoặc thiếu thông tin bắt buộc sẽ được đánh dấu tại từng trường.</div>
 {notice&&<div className="si-notice">{notice}</div>}<div className="si-config-actions"><button className="si-button si-button--outline" onClick={save}>▣ Lưu kịch bản (SI02)</button><button className="si-button si-button--primary" onClick={run}>▶ Chạy mô phỏng (SI03)</button></div></section>
 <aside className="si-card si-save-card"><h2>Lưu cấu hình kịch bản</h2><label>Tên kịch bản<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Mô tả<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label><h3>Tóm tắt</h3><div className="si-summary"><span>Loại</span><b>{kind}</b><span>Phạm vi</span><b>{hubs.length} Hub</b><span>Khung thời gian</span><b>{duration}</b><span>Mức tăng</span><b>+{increase}%</b></div><h3>Kịch bản đã lưu</h3>{savedScenarios.map(s=><button className="si-saved-item" key={s.name} onClick={()=>{setName(s.name);setDescription(s.detail);}}><b>{s.name}</b><small>{s.detail}</small><strong>›</strong></button>)}</aside></div></div>;
}

const hubShortage=[{hub:'Ga Metro',value:12,tone:'red',label:'thiếu 12'},{hub:'KTX Khu B',value:8,tone:'red',label:'thiếu 8'},{hub:'KTX Khu A',value:3,tone:'orange',label:'thiếu 3'},{hub:'Thư viện TT',value:0,tone:'green',label:'cân bằng'},{hub:'Tòa VNU',value:-14,tone:'green',label:'dư 14'}];
const recs=[
 {id:'r1',title:'Chuyển 12 xe Tòa VNU → Ga Metro',detail:'Trước 16:55 · giảm thiếu hụt còn 0',type:'move'},
 {id:'r2',title:'Chuyển 8 xe Thư viện TT → KTX Khu B',detail:'Trước 17:10',type:'move'},
 {id:'r3',title:'Ưu tiên sạc 6 xe tại KTX Khu A',detail:'Điều chỉnh lịch sạc #LS-0710-03',type:'charge'},
];
export function SimulationResultsPage(){
 const [active,setActive]=useState('SIM-0710-05');
 const navigate=useNavigate();
 return <div className="si-page"><SIHeader title="Kết quả mô phỏng · Tan học + Metro 17h" sub="Lần chạy #SIM-0710-05 · hoàn tất 16:46:30"><Tag tone="purple">📸 Snapshot 16:45:02 · dữ liệu thật không đổi</Tag></SIHeader>
 <div className="si-stats"><SIStat label="Tỉ lệ đáp ứng thuê/trả" value="82%" detail="Hiện tại 96% · giảm 14 điểm" tone="red"/><SIStat label="Hub nguy cơ quá tải" value="2 Hub" detail="Ga Metro 98% · KTX Khu B 95%" tone="orange"/><SIStat label="Xe thiếu hụt" value="23 xe" detail="Đỉnh điểm T+30 phút" tone="red"/><SIStat label="Khung mô phỏng" value="60 phút" detail="17:00–18:00 · 3 Hub"/></div>
 <div className="si-results-grid"><section className="si-card si-analysis"><h2>Số xe thiếu hụt theo Hub</h2><p>Tại thời điểm đỉnh T+30 phút</p><div className="si-shortages">{hubShortage.map(x=><div className="si-shortage" key={x.hub}><b>{x.hub}</b><div className="si-shortage-track"><i className={'tone-'+x.tone} style={{width:Math.abs(x.value)/14*100+'%'}}/></div><strong className={'tone-text-'+x.tone}>{x.label}</strong></div>)}</div><h3>Nguy cơ lấp đầy bến đỗ theo thời gian</h3><div className="si-bars">{[{t:'T',v:62},{t:'+10',v:74},{t:'+20',v:88},{t:'+30',v:98},{t:'+45',v:93},{t:'+60',v:81}].map(x=><div className="si-bar-wrap" key={x.t}><b>{x.v}%</b><i className={x.v>=93?'critical':x.v>=88?'warning':''} style={{height:x.v+'%'}}/><small>{x.t}</small></div>)}</div></section>
 <div className="si-results-side"><section className="si-card si-recommendations"><h2>Khuyến nghị điều phối (3)</h2><p>Chỉ trở thành thao tác thật qua SI05</p>{recs.map(r=><div className="si-recommendation" key={r.id}><span>{r.type==='move'?'⇄':'⚡'}</span><div><b>{r.title}</b><small>{r.detail}</small></div></div>)}<button className="si-button si-button--primary si-wide" onClick={()=>navigate('/simulations/SIM-0710-05/apply')}>Áp dụng khuyến nghị (SI05)</button></section>
 <section className="si-card si-history"><h2>Lịch sử mô phỏng</h2>{[{id:'SIM-0710-05',name:'Tan học + Metro 17h',tag:'Đang xem'},{id:'SIM-0706-02',name:'Cúp điện KTX A (2h)',tag:'06/10 · 71%'},{id:'SIM-0704-01',name:'Tái cân bằng sáng thứ 2',tag:'04/10 · 97%'}].map(x=><button key={x.id} className={active===x.id?'active':''} onClick={()=>setActive(x.id)}><b>#{x.id}</b><strong>{x.name}</strong><Tag>{x.tag}</Tag></button>)}</section></div></div></div>;
}

export function ApplyRecommendationsPage(){
 const [selected,setSelected]=useState(['r1','r3']);
 const [applied,setApplied]=useState(false);
 const toggle=(id:string)=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
 const feasible=(id:string)=>id!=='r2';
 return <div className="si-page"><SIHeader title="Áp dụng khuyến nghị · #SIM-0710-05" sub="Kiểm tra lại từng khuyến nghị với trạng thái thực tế mới nhất trước khi thực hiện"><Tag tone="purple">Snapshot 16:45:02</Tag></SIHeader>
 <section className="si-card si-compare"><h2>So sánh trạng thái thực tế (16:58:40) với snapshot (16:45:02)</h2><table><thead><tr><th>CHỈ SỐ</th><th>SNAPSHOT</th><th>THỰC TẾ</th><th>KHÁC BIỆT</th></tr></thead><tbody><tr><td>Xe sẵn sàng tại Tòa VNU</td><td>20</td><td>18</td><td><Tag tone="muted">−2 · nhỏ</Tag></td></tr><tr><td>Xe sẵn sàng tại Thư viện TT</td><td>10</td><td>3</td><td><Tag tone="yellow">−7 · đáng kể</Tag></td></tr></tbody></table></section>
 <div className="si-valid si-compare-valid">Khác biệt tổng thể dưới ngưỡng – kết quả mô phỏng vẫn còn hiệu lực. (Nếu khác biệt lớn, hệ thống cảnh báo kết quả có thể lỗi thời và đề xuất chạy lại SI03.)</div>
 <div className="si-apply-grid"><section className="si-card si-feasibility"><h2>Kiểm tra tính khả thi</h2><p>Chọn các khuyến nghị khả thi để áp dụng</p>{recs.map(r=><label key={r.id} className={'si-rec-choice'+(!feasible(r.id)?' disabled':'')+(selected.includes(r.id)?' checked':'')}><input type="checkbox" checked={selected.includes(r.id)} disabled={!feasible(r.id)||applied} onChange={()=>toggle(r.id)}/><span className="si-rec-copy"><b>{r.title}</b><small>{r.id==='r1'?'18 xe còn sẵn sàng · Ga Metro còn 14 chỗ trống':r.id==='r2'?'Thư viện TT chỉ còn 3 xe sẵn sàng (cần 8)':'5 cổng hoạt động · không xung đột lịch'}</small><em>{r.id==='r1'?'→ Sẽ tạo lệnh điều chuyển (RB01)':r.id==='r2'?'→ Không thực hiện':'→ Sẽ điều chỉnh lịch sạc (SC02)'}</em></span><Tag tone={feasible(r.id)?'green':'red'}>{feasible(r.id)?'✓ Khả thi':'× Không khả thi'}</Tag></label>)}<button className="si-button si-button--primary si-wide" disabled={!selected.length||applied} onClick={()=>setApplied(true)}>{applied?'Đã áp dụng '+selected.length+' khuyến nghị':'Áp dụng '+selected.length+' khuyến nghị đã chọn'}</button>{applied&&<div className="si-valid si-applied">✓ Các thao tác khả thi đã được ghi nhận. Kết quả mô phỏng gốc không thay đổi.</div>}</section>
 <aside className="si-card si-apply-log"><h2>Nhật ký áp dụng</h2><p>Kết quả mô phỏng gốc không thay đổi</p><div className="si-log-entry"><i>✓</i><div><b>{applied?'Đã tạo lệnh #DC-0710-027':'Đã tạo lệnh #DC-0710-027'}</b><small>Tòa VNU → Ga Metro · 12 xe khóa điều chuyển</small></div></div><div className="si-log-entry"><i>✓</i><div><b>Đã điều chỉnh lịch #LS-0710-03</b><small>6 xe KTX A được nâng ưu tiên</small></div></div><div className="si-log-entry muted"><i>−</i><div><b>Bỏ qua 1 khuyến nghị</b><small>Không khả thi trên trạng thái thực tế</small></div></div><div className="si-log-note">Thao tác thất bại do tài nguyên vừa thay đổi sẽ không được áp dụng; các thao tác đã thành công được giữ nguyên và báo cáo chi tiết.</div><Link className="si-button si-button--outline si-back-results" to="/simulations/SIM-0710-05/results">Quay lại kết quả mô phỏng</Link></aside></div></div>;
}
