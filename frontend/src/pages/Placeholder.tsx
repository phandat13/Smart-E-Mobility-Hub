import { useLocation } from 'react-router-dom';
import './placeholder.css';

export default function Placeholder() {
  const { pathname } = useLocation();
  return (
    <div className="placeholder">
      <h1 className="placeholder__title">Màn hình chưa được triển khai</h1>
      <p className="placeholder__description">
        Đường dẫn: <code>{pathname}</code>
      </p>
    </div>
  );
}
