import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import NetworkOverviewPage from './features/mo/pages/NetworkOverviewPage';
import {
  ChargerManagementPage,
  HubDetailPage,
  HubManagementPage,
  VehicleCatalogPage,
} from './features/mo/pages/HubOperationsPages';
import {
  AdjustChargingSchedulePage,
  ChargingSchedulePage,
} from './features/sc/pages/ChargingSchedulePages';
import {
  ApplyRecommendationsPage,
  SimulationResultsPage,
  WhatIfScenarioPage,
} from './features/si/pages/WhatIfSimulationPages';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<NetworkOverviewPage />} />
        <Route path="/hubs" element={<HubManagementPage />} />
        <Route path="/hubs/manage" element={<HubManagementPage />} />
        <Route path="/hubs/:hubId/chargers" element={<ChargerManagementPage />} />
        <Route path="/hubs/:hubId" element={<HubDetailPage />} />
        <Route path="/vehicles" element={<VehicleCatalogPage />} />
        <Route path="/charging-schedules" element={<ChargingSchedulePage />} />
        <Route path="/charging-schedules/adjust" element={<AdjustChargingSchedulePage />} />
        <Route path="/simulations" element={<WhatIfScenarioPage />} />
        <Route path="/simulations/:simulationId/results" element={<SimulationResultsPage />} />
        <Route path="/simulations/:simulationId/apply" element={<ApplyRecommendationsPage />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
