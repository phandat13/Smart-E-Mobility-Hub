import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { USE_MOCK } from '../../../api/client';
import { mockRegister } from '../../../mocks/accountMock';
import { http } from '../../../api/client';
import type { RegisterRequest } from '../../../api/authApi';
import './RegisterPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    password: '',
    fullName: '',
    studentCode: '',
    phone: '',
    email: '',
    citizenId: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterRequest, string>>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (name: keyof RegisterRequest, value: string): string => {
    switch (name) {
      case 'username':
        if (!value.trim()) return 'Tên đăng nhập không được để trống';
        if (!/^[a-zA-Z0-9._]{4,50}$/.test(value)) return '4-50 ký tự, chỉ chữ, số, dấu chấm, gạch dưới';
        break;
      case 'password':
        if (!value) return 'Mật khẩu không được để trống';
        if (value.length < 8 || value.length > 72) return '8-72 ký tự';
        if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) return 'Phải có cả chữ và số';
        break;
      case 'fullName':
        if (!value.trim()) return 'Họ tên không được để trống';
        if (value.length > 100) return 'Tối đa 100 ký tự';
        break;
      case 'studentCode':
        if (!value.trim()) return 'MSSV không được để trống';
        if (!/^[0-9A-Za-z]{6,20}$/.test(value)) return '6-20 ký tự chữ/số';
        break;
      case 'phone':
        if (!value.trim()) return 'SĐT không được để trống';
        if (!/^0\d{9}$/.test(value)) return '10 số, bắt đầu bằng 0';
        break;
      case 'email':
        if (!value.trim()) return 'Email không được để trống';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
        if (value.length > 100) return 'Tối đa 100 ký tự';
        break;
      case 'citizenId':
        if (!value.trim()) return 'CCCD/CMND không được để trống';
        if (!/^\d{12}$/.test(value)) return 'Đúng 12 chữ số';
        break;
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name as keyof RegisterRequest, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
    if (serverError) setServerError('');
  };

  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (serverError) setServerError('');
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof RegisterRequest, string>> = {};
    let hasError = false;

    (Object.keys(formData) as (keyof RegisterRequest)[]).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
        hasError = true;
      }
    });

    if (!agreeTerms) {
      setTermsError(true);
      hasError = true;
    }

    if (formData.password !== confirmPassword) {
      newErrors.password = 'Mật khẩu nhập lại không khớp';
      hasError = true;
    }

    setErrors(newErrors);
    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const payload = { ...formData };
      if (USE_MOCK) {
        await mockRegister(payload);
      } else {
        await http('/api/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate(`/register/success?mssv=${formData.studentCode}`);
    } catch (err: unknown) {
      const apiErr = err as { code?: string; details?: Record<string, unknown>; message?: string };
      if (apiErr.code === 'USERNAME_TAKEN') {
        setErrors((prev) => ({ ...prev, username: 'Tên đăng nhập đã tồn tại' }));
      } else if (apiErr.code === 'CITIZEN_ID_INVALID' && apiErr.details?.field === 'citizenId') {
        setErrors((prev) => ({ ...prev, citizenId: 'Số CCCD/CMND không hợp lệ' }));
      } else if (apiErr.code === 'CONFLICT' && apiErr.details?.field) {
        const field = apiErr.details.field as keyof RegisterRequest;
        if (field === 'studentCode') {
          setErrors((prev) => ({ ...prev, studentCode: 'MSSV đã được đăng ký' }));
        } else if (field === 'email') {
          setErrors((prev) => ({ ...prev, email: 'Email đã được đăng ký' }));
        }
      } else {
        setServerError(apiErr.message || 'Đăng ký thất bại, vui lòng thử lại');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fields: { name: keyof RegisterRequest; label: string; type: string; placeholder: string }[] = [
    { name: 'fullName', label: 'Họ tên', type: 'text', placeholder: 'Nguyễn Văn An' },
    { name: 'studentCode', label: 'MSSV', type: 'text', placeholder: '2410734' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'an.nguyen@student.hcmut.edu.vn' },
    { name: 'phone', label: 'SĐT', type: 'tel', placeholder: '09xxxxxxxx' },
    { name: 'citizenId', label: 'CCCD/CMND', type: 'text', placeholder: '123456789012' },
    { name: 'username', label: 'Tên đăng nhập', type: 'text', placeholder: 'nguyenvanan' },
    { name: 'password', label: 'Mật khẩu', type: 'password', placeholder: '••••••••' },
  ];

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card register-card">
          <div className="login-header">
            <h1 className="login-title">Đăng ký hồ sơ sinh viên</h1>
            <p className="login-subtitle">Điền đầy đủ thông tin và đồng ý cam kết sử dụng để gửi hồ sơ.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {serverError && <div className="login-error" role="alert">{serverError}</div>}

            <div className="form-grid">
              {fields.map((field) => (
                <div key={field.name} className="form-group">
                  <label htmlFor={field.name} className="form-label">
                    {field.label} <span className="required">*</span>
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    className={`form-input${errors[field.name] ? ' form-input--error' : ''}`}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    disabled={isLoading}
                    autoComplete={field.name === 'password' ? 'new-password' : field.name}
                    autoFocus={field.name === 'fullName'}
                  />
                  {errors[field.name] && (
                    <span className="form-error">{errors[field.name]}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Nhập lại mật khẩu <span className="required">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                value={confirmPassword}
                onChange={handleConfirmChange}
                placeholder="Nhập lại mật khẩu"
                disabled={isLoading}
                autoComplete="new-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="register__pledge">
              <strong>Cam kết sử dụng hệ thống</strong>
              <p>
                Tôi cam kết thông tin khai báo là chính xác; tuân thủ quy định đặt – nhận – trả phương tiện dùng chung,
                đặt chỗ đỗ/sạc tại các Mobility Hub và chịu trách nhiệm với phương tiện trong thời gian sử dụng.
              </p>
            </div>

            <div className="form-group terms-group">
              <label className="register__agree">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => { setAgreeTerms(e.target.checked); setTermsError(false); }}
                  disabled={isLoading}
                />
                <span>Tôi đã đọc và đồng ý với cam kết sử dụng hệ thống</span>
              </label>
              {termsError && <span className="form-error" role="alert">Vui lòng đồng ý với cam kết để gửi hồ sơ</span>}
            </div>

            <div className="register__note">
              Sau khi gửi, thông tin tình trạng xác thực tài khoản sẽ được gửi đến bạn qua Email hoặc SMS trong vòng 24 giờ.
            </div>

            <button
              type="submit"
              className="btn btn--primary login-submit"
              disabled={isLoading}
            >
              {isLoading ? 'Đang gửi hồ sơ…' : 'Gửi hồ sơ đăng ký'}
            </button>
          </form>

          <div className="login-footer">
            <p className="login-register-link">
              Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}