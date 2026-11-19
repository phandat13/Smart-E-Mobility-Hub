import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, HttpError } from '../api/client';
import type { RegisterResult, Role } from '../api/types';
import { Field, KV, Modal, Spinner, errorText } from '../components/ui';
import { homeFor, roleLabel, useAuth } from '../lib/auth';

const USERNAME_RE = /^[a-zA-Z0-9._]*$/;

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const invalidChars = !USERNAME_RE.test(username);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalidChars) return;
    setBusy(true);
    setError('');
    try {
      const t = await login(username.trim(), password, 'STUDENT');
      nav(homeFor(t.user.activeRole));
    } catch (err) {
      setError(errorText(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-bg">
      <div>
        <form className="auth-card" onSubmit={submit}>
          <div className="brand-logo">🚲</div>
          <div className="eyebrow center">Cổng sinh viên ĐHQG</div>
          <h1 className="center">Chào bạn, đi xanh cùng UniGo!</h1>
          <p className="center muted mt-8 mb-16">Đăng nhập để tìm Hub, đặt xe và đặt chỗ đỗ/sạc.</p>
          <Field label="Tên đăng nhập" error={invalidChars ? 'Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới' : undefined}>
            <input className={`input ${invalidChars ? 'error' : ''}`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="vd: anh.nm2410717" autoFocus />
          </Field>
          <Field label="Mật khẩu">
            <div style={{ position: 'relative' }}>
              <input className="input" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="btn link sm" style={{ position: 'absolute', right: 6, top: 6 }} onClick={() => setShow(!show)}>👁</button>
            </div>
          </Field>
          {error && <div className="banner error mb-12">{error}</div>}
          <button className="btn lg block" disabled={busy || !username || !password}>{busy ? <Spinner /> : 'Đăng nhập'}</button>
          <div className="divider" />
          <p className="center small"><Link to="/register">Chưa có tài khoản? Đăng ký hồ sơ sinh viên</Link></p>
          <p className="center small muted mt-8">Nhân sự vận hành, tài xế, kỹ thuật viên → <Link to="/internal/login">Cổng nội bộ</Link></p>
        </form>
        <p className="center tiny muted mt-12">Tài khoản demo: anh.nm2410717 / 123456</p>
      </div>
    </div>
  );
}

/**
 * Góp ý #2: Cổng nội bộ KHÔNG cho người dùng tự chọn vai trò. Vai trò lấy từ tài khoản sau khi đăng nhập;
 * nếu tài khoản có nhiều vai trò đã được cấp, giao diện cho chọn NGỮ CẢNH làm việc và server kiểm tra lại quyền.
 */
export function InternalLoginPage() {
  const { login, switchContext } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Role[] | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const t = await login(username.trim(), password, 'INTERNAL');
      if (t.requiresContextSelection) setChoices(t.user.roles.filter((r) => r !== 'STUDENT'));
      else nav(homeFor(t.user.activeRole));
    } catch (err) {
      setError(errorText(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-bg dark">
      <div>
        <form className="auth-card" onSubmit={submit}>
          <div className="brand-logo">⚡</div>
          <h1 className="center">UniGo – Cổng nội bộ</h1>
          <p className="center muted mt-8 mb-16">Dành cho Đơn vị vận hành, Tài xế điều chuyển và Kỹ thuật viên bảo trì</p>
          <Field label="Tên đăng nhập"><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></Field>
          <Field label="Mật khẩu"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <div className="banner error mb-12">{error}</div>}
          <button className="btn lg block" disabled={busy || !username || !password}>{busy ? <Spinner /> : 'Đăng nhập'}</button>
          <div className="banner info mt-16 small">🔒 Vai trò được xác định từ tài khoản đã cấp. Mỗi vai trò chỉ truy cập được chức năng và dữ liệu thuộc phạm vi của mình.</div>
          <p className="center small mt-16"><Link to="/login">← Về cổng sinh viên</Link></p>
        </form>
        <p className="center tiny mt-12" style={{ color: '#9aa6c4' }}>Demo: vanhanh.trangle · taixe.vanbinh · kythuat.vannam · truongca.hoang (đa vai trò) / 123456</p>
      </div>
      <Modal open={!!choices} onClose={() => { setChoices(null); nav('/ops'); }}>
        <h2>Chọn ngữ cảnh làm việc</h2>
        <p className="muted mt-8">Tài khoản của bạn được cấp {choices?.length} vai trò. Chọn ngữ cảnh cho phiên làm việc này (có thể đổi sau).</p>
        <div className="col mt-16">
          {choices?.map((r) => (
            <button key={r} className="choice" onClick={async () => {
              try { const u = await switchContext(r); nav(homeFor(u.activeRole)); } catch (err) { setError(errorText(err)); setChoices(null); }
            }}><div className="t">{roleLabel[r]}</div><div className="d">{r === 'OPERATOR' ? 'Dashboard, điều chuyển, lịch sạc, mô phỏng' : r === 'TECHNICIAN' ? 'Lệnh & phiếu bảo trì' : 'Lệnh điều chuyển xe'}</div></button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

const EMPTY = { fullName: '', studentCode: '', email: '', phone: '', citizenId: '', school: 'ĐH Bách khoa – ĐHQG-HCM', username: '', password: '', acceptTerms: false };

export function RegisterPage() {
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<RegisterResult | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string; checked?: boolean; type?: string } }) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  // E1: kiểm tra ngay trên giao diện và chỉ rõ vị trí lỗi
  const validate = () => {
    const er: Record<string, string> = {};
    if (!/^[\p{L} .'-]+$/u.test(f.fullName)) er.fullName = 'Họ tên chỉ gồm chữ cái và khoảng trắng';
    if (!/^\d{7,10}$/.test(f.studentCode)) er.studentCode = 'Mã số sinh viên gồm 7–10 chữ số';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Email không hợp lệ';
    if (!/^0\d{9}$/.test(f.phone)) er.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0';
    if (!/^\d{12}$/.test(f.citizenId)) er.citizenId = 'Số CCCD gồm 12 chữ số';
    if (!/^[a-zA-Z0-9._]{4,50}$/.test(f.username)) er.username = 'Tên đăng nhập 4–50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới';
    if (f.password.length < 6) er.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (!f.acceptTerms) er.acceptTerms = 'Bạn cần đồng ý cam kết sử dụng hệ thống';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      setDone(await api<RegisterResult>('/api/v1/auth/register', { body: f }));
    } catch (err) {
      if (err instanceof HttpError) { setErrors(err.fields); setError(err.message); } else setError(errorText(err));
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="auth-bg">
        <div className="auth-card center">
          <div className="modal-icon green">✓</div>
          <h1>Đã gửi hồ sơ đăng ký!</h1>
          <p className="muted mt-8">{done.status === 'ACTIVE' ? 'Tài khoản đã được xác thực.' : 'Hồ sơ của bạn đang được hệ thống xác thực.'}</p>
          <div className="mt-16" style={{ textAlign: 'left' }}>
            <KV k="Mã hồ sơ" v={done.profileCode} /><KV k="Họ và tên" v={done.fullName} /><KV k="Email" v={done.email} />
            <KV k="Trạng thái" v={done.message} />
          </div>
          <div className="banner info mt-16 small">Kết quả xác thực được gửi qua Email và SMS ({done.maskedPhone}) trong vòng 24 giờ.</div>
          <Link className="btn block mt-16" to="/login">Về trang đăng nhập</Link>
        </div>
      </div>
    );
  }

  const inp = (k: keyof typeof EMPTY, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label} error={errors[k]}>
      <input className={`input ${errors[k] ? 'error' : ''}`} value={f[k] as string} onChange={set(k)} {...props} />
    </Field>
  );

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand"><div className="brand-logo">⚡</div><div className="brand-name">UniGo · Đăng ký hồ sơ sinh viên</div></div></header>
      <div className="page narrow">
        <form className="card pad-lg" onSubmit={submit} noValidate>
          <h1>Đăng ký hồ sơ sinh viên</h1>
          <p className="muted mt-8 mb-16">Điền đầy đủ thông tin và đồng ý cam kết sử dụng để gửi hồ sơ.</p>
          <div className="grid cols-2" style={{ gap: '0 16px' }}>
            {inp('fullName', 'Họ và tên')}{inp('studentCode', 'Mã số sinh viên', { inputMode: 'numeric' })}
            {inp('email', 'Email sinh viên', { type: 'email' })}{inp('phone', 'Số điện thoại', { inputMode: 'tel' })}
            {inp('citizenId', 'Số CCCD', { inputMode: 'numeric' })}{inp('school', 'Trường')}
            {inp('username', 'Tên đăng nhập')}{inp('password', 'Mật khẩu', { type: 'password' })}
          </div>
          <div className="banner info small"><div><b>Cam kết sử dụng hệ thống</b><br />Tôi cam kết thông tin khai báo là chính xác; tuân thủ quy định đặt – nhận – trả phương tiện dùng chung, đặt chỗ đỗ/sạc tại các Mobility Hub và chịu trách nhiệm với phương tiện trong thời gian sử dụng.</div></div>
          <label className="checkbox mt-12"><input type="checkbox" checked={f.acceptTerms} onChange={set('acceptTerms')} /> Tôi đã đọc và đồng ý với cam kết sử dụng hệ thống</label>
          {errors.acceptTerms && <div className="field-error">{errors.acceptTerms}</div>}
          <p className="hint mt-8">🔒 Số CCCD và số điện thoại được mã hóa khi lưu trữ.</p>
          {error && <div className="banner error mt-12">{error}</div>}
          <button className="btn lg block mt-16" disabled={busy}>{busy ? <Spinner /> : 'Gửi hồ sơ đăng ký'}</button>
          <p className="center small mt-12"><Link to="/login">Đã có tài khoản? Đăng nhập</Link></p>
        </form>
      </div>
    </div>
  );
}
