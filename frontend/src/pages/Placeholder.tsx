import { useLocation } from 'react-router-dom';

export default function Placeholder() {
  const { pathname } = useLocation();
  return (
    <div className="card">
      <h1 style={{ fontSize: 20, margin: 0 }}>Màn hình chưa được triển khai</h1>
      <p style={{ color: 'var(--muted)' }}>
        Đường dẫn: <code>{pathname}</code>
      </p>
    </div>
  );
}
