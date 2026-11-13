import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useSyncStatus } from './useSyncStatus';
import './layout.css';

export default function AppLayout() {
  const sync = useSyncStatus();
  return (
    <div className="app">
      <Sidebar sync={sync} />
      <div className="app__main">
        <Topbar />
        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
