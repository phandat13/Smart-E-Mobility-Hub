import { Link, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './layout.css';

// Adapted from the operator layout in feat/mo-sc-si-frontend; see /README.md.
export default function AppLayout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="app__main">
        <Topbar />
        <main className="app__content"><Outlet /><footer className="portal-demo"><span>Dữ liệu mô phỏng · Cổng vận hành</span><Link to="/setup">Đổi cổng / điều khiển demo</Link></footer></main>
      </div>
    </div>
  );
}
