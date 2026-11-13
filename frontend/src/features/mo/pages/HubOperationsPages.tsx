export { HubDetailPage } from './HubDetailPage';
export { HubManagementPage } from './HubManagementPage';
export { ChargerManagementPage } from './ChargerManagementPage';
export { VehicleCatalogPage } from './VehicleCatalogPage';
import { useLocation } from 'react-router-dom';
import { HubDetailPage } from './HubDetailPage';
import { HubManagementPage } from './HubManagementPage';
import { ChargerManagementPage } from './ChargerManagementPage';
export function HubOperationsRouter() {
  const { pathname } = useLocation();
  if (pathname.endsWith('/chargers')) return <ChargerManagementPage />;
  if (pathname === '/hubs/manage' || pathname === '/hubs') return <HubManagementPage />;
  return <HubDetailPage />;
}
