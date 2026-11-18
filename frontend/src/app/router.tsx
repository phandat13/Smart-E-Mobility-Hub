import { createBrowserRouter } from 'react-router'
import { ReservationPage } from '../features/re/pages/ReservationPage'
import { VehicleListPage } from '../features/re/pages/VehicleListPage'
import { AppShell, Placeholder } from './AppShell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Placeholder title="Trang chủ" /> },
      // ---- RE (FE2) ----
      { path: 'reserve', element: <VehicleListPage /> },
      { path: 'reserve/current', element: <ReservationPage /> },
      // ---- Module khác ----
      { path: 'trips', element: <Placeholder title="Chuyến đi" /> },
      { path: 'account', element: <Placeholder title="Tài khoản" /> },
      { path: '*', element: <Placeholder title="Không tìm thấy trang" /> },
    ],
  },
])
