import { Link, useLocation } from 'react-router-dom';

export default function NotImplementedPage({ title }: { title: string }) {
  const { pathname } = useLocation();
  return (
    <section className="card" aria-labelledby="placeholder-title">
      <h1 id="placeholder-title">{title}</h1>
      <p>Mới chuẩn bị cấu trúc dự án. Chức năng và kết nối API chưa được triển khai.</p>
      <p>Đường dẫn: <code>{pathname}</code></p>
      <Link to="/setup">Về trang thiết lập</Link>
    </section>
  );
}
