import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import { updateProfileApi } from '../../../api/authApi';
import './ProfilePage.css';

type FormData = {
  fullName: string;
  phone: string;
  address: string;
  nickname: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';

/** AC04 · Chỉnh sửa thông tin tài khoản sinh viên (+ đổi mật khẩu). */
export default function ProfilePage() {
  const { user, restoreSession, logout } = useAuth();
  const navigate = useNavigate();

  const fromUser = (): FormData => ({
    fullName: user?.fullName || '',
    phone: user?.student?.phone || '',
    address: user?.student?.address || '',
    nickname: user?.student?.nickname || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [form, setForm] = useState<FormData>(fromUser);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (user) setForm(fromUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const validate = (name: keyof FormData, value: string, all: FormData = form): string => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) return 'Họ tên không được để trống';
        if (value.length > 100) return 'Tối đa 100 ký tự';
        return '';
      case 'phone':
        return value && !/^0\d{9}$/.test(value) ? '10 số, bắt đầu bằng 0' : '';
      case 'address':
        return value.length > 200 ? 'Tối đa 200 ký tự' : '';
      case 'nickname':
        return value.length > 50 ? 'Tối đa 50 ký tự' : '';
      case 'newPassword':
        return value && (value.length < 8 || value.length > 72 || !/[a-zA-Z]/.test(value) || !/[0-9]/.test(value))
          ? '8-72 ký tự, có cả chữ và số'
          : '';
      case 'confirmPassword':
        return all.newPassword && value !== all.newPassword ? 'Mật khẩu nhập lại không khớp' : '';
      default:
        return '';
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof FormData;
    const next = { ...form, [name]: e.target.value };
    setForm(next);
    setErrors((p) => ({
      ...p,
      [name]: validate(name, e.target.value, next),
      ...(name === 'newPassword' && next.confirmPassword ? { confirmPassword: validate('confirmPassword', next.confirmPassword, next) } : {}),
    }));
    if (serverError) setServerError('');
    if (success) setSuccess('');
  };

  const changes = () => {
    const c: Record<string, string> = {};
    if (!user) return c;
    if (form.fullName !== user.fullName) c.fullName = form.fullName;
    if (form.phone !== (user.student?.phone || '')) c.phone = form.phone;
    if (form.address !== (user.student?.address || '')) c.address = form.address;
    if (form.nickname !== (user.student?.nickname || '')) c.nickname = form.nickname;
    if (form.newPassword) {
      c.currentPassword = form.currentPassword;
      c.newPassword = form.newPassword;
    }
    return c;
  };
  const dirty = Object.keys(changes()).length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setSuccess('');

    const next: Partial<FormData> = {};
    (Object.keys(form) as (keyof FormData)[]).forEach((k) => {
      const m = validate(k, form[k]);
      if (m) next[k] = m;
    });
    if (form.newPassword && !form.currentPassword) next.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!dirty) return setServerError('Không có thay đổi nào để lưu');

    setLoading(true);
    try {
      await updateProfileApi(changes());
      await restoreSession();
      setForm((p) => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setSuccess('Cập nhật thông tin thành công');
    } catch (err: unknown) {
      const apiErr = err as { code?: string; details?: Record<string, unknown>; message?: string };
      if (apiErr.code === 'VALIDATION_FAILED' && typeof apiErr.details?.currentPassword === 'string') {
        setErrors((p) => ({ ...p, currentPassword: apiErr.details!.currentPassword as string }));
      } else {
        setServerError(apiErr.message || 'Cập nhật thất bại, vui lòng thử lại');
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(fromUser());
    setErrors({});
    setServerError('');
    setSuccess('');
  };

  const field = (name: keyof FormData, label: string, opts: { type?: string; placeholder?: string; auto?: string } = {}) => (
    <div className="profile__field">
      <label htmlFor={`profile__${name}`}>{label}</label>
      <input
        id={`profile__${name}`}
        name={name}
        type={opts.type ?? 'text'}
        value={form[name]}
        onChange={onChange}
        placeholder={opts.placeholder}
        autoComplete={opts.auto}
        disabled={loading}
        className={errors[name] ? 'is-error' : ''}
        aria-invalid={!!errors[name]}
      />
      {errors[name] && <span className="profile__err" role="alert">{errors[name]}</span>}
    </div>
  );

  const student = user?.student;

  return (
    <div className="profile">
      <aside className="profile__side">
        <div className="profile__avatar" aria-hidden="true">{initials(user?.fullName || '')}</div>
        <h2 className="profile__name">{user?.fullName || 'Sinh viên'}</h2>
        <div className="profile__meta">MSSV {student?.studentCode || '—'} · ĐH Bách khoa</div>
        <nav className="profile__nav" aria-label="Menu tài khoản">
          <button className="profile__nav-item is-active" aria-current="page">Hồ sơ cá nhân</button>
          <Link className="profile__nav-item" to="/student/booking">Phương tiện của tôi</Link>
          <Link className="profile__nav-item" to="/account/trips">Lịch sử chuyến đi</Link>
          <Link className="profile__nav-item" to="/student/booking">Lịch sử đặt xe</Link>
          <button className="profile__nav-item" onClick={() => { logout(); navigate('/login'); }}>Đăng xuất</button>
        </nav>
      </aside>

      <main className="profile__main">
        <div className="profile__head">
          <h1>Hồ sơ cá nhân</h1>
          <span className="profile__badge">Đang chỉnh sửa</span>
        </div>
        <p className="profile__sub">Cập nhật thông tin liên lạc hoặc đổi mật khẩu tài khoản.</p>

        {success && <div className="profile__toast profile__toast--ok" role="status">{success}</div>}
        {serverError && <div className="profile__toast profile__toast--err" role="alert">{serverError}</div>}

        <form onSubmit={submit} noValidate>
          <div className="profile__grid">
            {field('fullName', 'Họ và tên', { auto: 'name' })}
            <div className="profile__field">
              <label htmlFor="profile__code">Mã số sinh viên (không thể thay đổi)</label>
              <input id="profile__code" value={student?.studentCode || ''} readOnly disabled />
            </div>
            <div className="profile__field">
              <label htmlFor="profile__email">Email sinh viên</label>
              <input id="profile__email" type="email" value={student?.email || ''} readOnly disabled />
            </div>
            {field('phone', 'Số điện thoại', { type: 'tel', placeholder: '09xxxxxxxx', auto: 'tel' })}
            {field('nickname', 'Biệt danh', { auto: 'nickname' })}
            {field('address', 'Địa chỉ cư trú', { auto: 'address-line1' })}
          </div>

          <h2 className="profile__section">Đổi mật khẩu</h2>
          <div className="profile__grid profile__grid--3">
            {field('currentPassword', 'Mật khẩu hiện tại', { type: 'password', auto: 'current-password' })}
            {field('newPassword', 'Mật khẩu mới', { type: 'password', placeholder: '8-72 ký tự, có chữ và số', auto: 'new-password' })}
            {field('confirmPassword', 'Nhập lại mật khẩu mới', { type: 'password', auto: 'new-password' })}
          </div>

          <div className="profile__note">Hệ thống kiểm tra tính hợp lệ trước khi lưu; kết quả cập nhật được thông báo qua Email hoặc SMS.</div>

          <div className="profile__actions">
            <button type="button" className="profile__btn" onClick={reset} disabled={loading}>Hủy</button>
            <button type="submit" className="profile__btn profile__btn--primary" disabled={loading || !dirty}>
              {loading ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
