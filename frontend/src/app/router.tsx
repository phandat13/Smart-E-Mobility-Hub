import { createBrowserRouter } from 'react-router'
import { ActiveTripPage } from '../features/re/pages/ActiveTripPage'
import { PickupPage } from '../features/re/pages/PickupPage'
import { PickupSuccessPage } from '../features/re/pages/PickupSuccessPage'
import { ReservationHistoryPage } from '../features/re/pages/ReservationHistoryPage'
import { ReservationPage } from '../features/re/pages/ReservationPage'
import { ReturnPage } from '../features/re/pages/ReturnPage'
import { TripsIndexRedirect, TripSummaryPage } from '../features/re/pages/TripSummaryPage'
import { VehicleListPage } from '../features/re/pages/VehicleListPage'
import { AppShell, Placeholder } from './AppShell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Placeholder title="Trang chủ" /> },
      { path: 'reserve', element: <VehicleListPage /> },
      { path: 'reserve/current', element: <ReservationPage /> },
      { path: 'pickup', element: <PickupPage /> },
      { path: 'pickup/success', element: <PickupSuccessPage /> },
      { path: 'trips', element: <TripsIndexRedirect /> },
      { path: 'trips/history', element: <ReservationHistoryPage /> },
      { path: 'trips/current', element: <ActiveTripPage /> },
      { path: 'trips/current/return', element: <ReturnPage /> },
      { path: 'trips/:id/summary', element: <TripSummaryPage /> },
      { path: 'account', element: <Placeholder title="Tài khoản" /> },
      { path: '*', element: <Placeholder title="Không tìm thấy trang" /> },
    ],
  },
])
