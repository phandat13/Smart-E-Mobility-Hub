import { useSearchParams, useNavigate } from 'react-router-dom';
import './RegisterSuccessPage.css';

export default function RegisterSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mssv = searchParams.get('mssv') || '2410734';

  const handleBackToLogin = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card success-card">
          <div className="success-icon" aria-hidden="true">✓</div>
          <div className="login-header">
            <h1 className="login-title">Gửi hồ sơ thành công</h1>
            <p className="login-subtitle">Hồ sơ của bạn đang chờ xác thực</p>
          </div>

          <div className="success-info">
            <div className="success-row">
              <span className="success-label">Mã hồ sơ</span>
              <span className="success-value">#DK-{mssv}</span>
            </div>
            <div className="success-row">
              <span className="success-label">Trạng thái</span>
              <span className="success-status">Đang chờ xác thực</span>
            </div>
          </div>

          <p className="success-note">
            Đơn vị vận hành sẽ xem xét và phê duyệt hồ sơ trong vòng 1-2 ngày làm việc.
            Bạn sẽ nhận được thông báo qua email khi có kết quả.
          </p>

          <button
            type="button"
            className="btn btn--primary success-btn"
            onClick={handleBackToLogin}
          >
            Về trang đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}