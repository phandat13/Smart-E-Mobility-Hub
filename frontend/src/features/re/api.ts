import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../shared/api/http'
import type { Hub, Reservation, Vehicle } from './types'

export const reKeys = {
  currentReservation: ['re', 'reservations', 'current'] as const,
  hubs: ['re', 'hubs'] as const,
  vehicles: (hubId: number | null) => ['re', 'vehicles', { hubId }] as const,
  vehicle: (id: number) => ['re', 'vehicles', id] as const,
}

/** Polling trạng thái đơn (A.2: MVP dùng polling, không WebSocket). */
const CURRENT_POLL_MS = 10_000

// ---------- Đọc ----------

/** Đơn đang giữ chỗ hoặc đang đi của tôi; `null` khi backend trả 204. */
export function useCurrentReservation() {
  return useQuery({
    queryKey: reKeys.currentReservation,
    queryFn: () => http.get<Reservation>('/reservations/current'),
    refetchInterval: CURRENT_POLL_MS,
  })
}

/** Contract đề xuất: GET /hubs (backend chưa có). */
export function useHubs() {
  return useQuery({
    queryKey: reKeys.hubs,
    queryFn: async () => (await http.get<Hub[]>('/hubs')) ?? [],
    staleTime: 5 * 60_000,
  })
}

/** Contract đề xuất: GET /vehicles?hubId=&status=AVAILABLE (B.5; backend chưa có). */
export function useAvailableVehicles(hubId: number | null) {
  return useQuery({
    queryKey: reKeys.vehicles(hubId),
    queryFn: async () => {
      const qs = new URLSearchParams({ status: 'AVAILABLE' })
      if (hubId != null) qs.set('hubId', String(hubId))
      return (await http.get<Vehicle[]>(`/vehicles?${qs}`)) ?? []
    },
    refetchInterval: CURRENT_POLL_MS,
  })
}

/** Contract đề xuất: GET /vehicles/{id} (backend chưa có). */
export function useVehicle(id: number | undefined) {
  return useQuery({
    queryKey: reKeys.vehicle(id ?? -1),
    queryFn: () => http.get<Vehicle>(`/vehicles/${id}`),
    enabled: id != null,
  })
}

// ---------- Ghi ----------

/** RE01: POST /reservations {vehicleId} → 201 + đơn mới. */
export function useReserve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vehicleId: number) => http.post<Reservation>('/reservations', { vehicleId }),
    onSuccess: (reservation) => {
      qc.setQueryData(reKeys.currentReservation, reservation)
      qc.invalidateQueries({ queryKey: ['re', 'vehicles'] })
    },
  })
}
