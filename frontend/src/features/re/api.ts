import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../shared/api/http'
import { POLL_MS } from './types'
import type {
  Hub,
  Incident,
  IncidentCategory,
  IncidentTarget,
  OfflineReturnRequest,
  PageResponse,
  PickupRequest,
  RatingRequest,
  Reservation,
  ReservationDetail,
  ReservationStatus,
  ReservationSummary,
  ReturnCheck,
  ReturnRequest,
  Trip,
  Vehicle,
} from './types'

export const reKeys = {
  all: ['re'] as const,
  currentReservation: ['re', 'reservations', 'current'] as const,
  reservationHistory: (status: ReservationStatus | null, page: number) =>
    ['re', 'reservations', 'history', { status, page }] as const,
  reservationDetail: (id: number) => ['re', 'reservations', 'detail', id] as const,
  hubs: ['re', 'hubs'] as const,
  vehicles: (hubId: number | null) => ['re', 'vehicles', { hubId }] as const,
  vehicle: (id: number) => ['re', 'vehicles', id] as const,
  currentTrip: ['re', 'trips', 'current'] as const,
  trip: (id: number) => ['re', 'trips', id] as const,
  returnCheck: (tripId: number, hubId: number) => ['re', 'trips', tripId, 'return-check', hubId] as const,
}

function useInvalidateRe() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: reKeys.all })
}

export function useCurrentReservation() {
  return useQuery({
    queryKey: reKeys.currentReservation,
    queryFn: () => http.get<Reservation>('/reservations/current'),
    refetchInterval: POLL_MS.reservation,
  })
}

export function useReservationHistory(status: ReservationStatus | null, page: number, size = 10) {
  return useQuery({
    queryKey: reKeys.reservationHistory(status, page),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), size: String(size) })
      if (status) qs.set('status', status)
      return (await http.get<PageResponse<ReservationSummary>>(`/reservations?${qs}`))!
    },
    placeholderData: keepPreviousData,
  })
}

export function useReservationDetail(id: number | null) {
  return useQuery({
    queryKey: reKeys.reservationDetail(id ?? -1),
    queryFn: async () => (await http.get<ReservationDetail>(`/reservations/${id}`))!,
    enabled: id != null,
  })
}

export function useHubs() {
  return useQuery({
    queryKey: reKeys.hubs,
    queryFn: async () => (await http.get<Hub[]>('/hubs')) ?? [],
    staleTime: 5 * 60_000,
  })
}

export function useAvailableVehicles(hubId: number | null, enabled = true) {
  return useQuery({
    queryKey: reKeys.vehicles(hubId),
    queryFn: async () => {
      const qs = new URLSearchParams({ status: 'AVAILABLE' })
      if (hubId != null) qs.set('hubId', String(hubId))
      return (await http.get<Vehicle[]>(`/vehicles?${qs}`)) ?? []
    },
    refetchInterval: POLL_MS.reservation,
    enabled,
  })
}

export function useVehicle(id: number | undefined) {
  return useQuery({
    queryKey: reKeys.vehicle(id ?? -1),
    queryFn: () => http.get<Vehicle>(`/vehicles/${id}`),
    enabled: id != null,
  })
}

export function useCurrentTrip() {
  return useQuery({
    queryKey: reKeys.currentTrip,
    queryFn: () => http.get<Trip>('/trips/current'),
    refetchInterval: POLL_MS.trip,
  })
}

export function useTrip(id: number) {
  return useQuery({
    queryKey: reKeys.trip(id),
    queryFn: async () => (await http.get<Trip>(`/trips/${id}`))!,
    enabled: Number.isFinite(id),
  })
}

export function useReturnCheck(tripId: number | undefined, hubId: number | null) {
  return useQuery({
    queryKey: reKeys.returnCheck(tripId ?? -1, hubId ?? -1),
    queryFn: async () => (await http.post<ReturnCheck>(`/trips/${tripId}/return/check`, { hubId }))!,
    enabled: tripId != null && hubId != null,
    refetchInterval: (query) => (query.state.data?.slotConfirmed ? false : POLL_MS.returnCheck),
  })
}

export function useReserve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vehicleId: number) => http.post<Reservation>('/reservations', { vehicleId }),
    onSuccess: (reservation) => {
      qc.setQueryData(reKeys.currentReservation, reservation)
      qc.invalidateQueries({ queryKey: ['re', 'vehicles'] })
      qc.invalidateQueries({ queryKey: ['re', 'reservations', 'history'] })
    },
  })
}

export function useCancelReservation() {
  const invalidate = useInvalidateRe()
  return useMutation({
    mutationFn: (id: number) => http.post<Reservation>(`/reservations/${id}/cancel`),
    onSettled: invalidate,
  })
}

export function useExtendReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => http.post<Reservation>(`/reservations/${id}/extend`),
    onSuccess: (reservation) => {
      qc.setQueryData(reKeys.currentReservation, reservation)
      qc.invalidateQueries({ queryKey: ['re', 'reservations', 'history'] })
      qc.invalidateQueries({ queryKey: ['re', 'reservations', 'detail'] })
    },
    onError: () => qc.invalidateQueries({ queryKey: reKeys.currentReservation }),
  })
}

export function usePickup() {
  const qc = useQueryClient()
  const invalidate = useInvalidateRe()
  return useMutation({
    mutationFn: (req: PickupRequest) => http.post<Trip>('/rentals/pickup', req),
    onSuccess: (trip) => {
      qc.setQueryData(reKeys.currentTrip, trip)
    },
    onSettled: () => void invalidate(),
  })
}

export function useUploadReturnPhoto() {
  return useMutation({
    mutationFn: ({ tripId, photo }: { tripId: number; photo: File }) => {
      const form = new FormData()
      form.append('photo', photo)
      return http.postForm<{ proofId: string }>(`/trips/${tripId}/return/photo`, form)
    },
  })
}

export function useReturnTrip() {
  const qc = useQueryClient()
  const invalidate = useInvalidateRe()
  return useMutation({
    mutationFn: ({ tripId, body }: { tripId: number; body: ReturnRequest }) =>
      http.post<Trip>(`/trips/${tripId}/return`, body),
    onSuccess: (trip) => {
      if (trip) qc.setQueryData(reKeys.trip(trip.id), trip)
    },
    onSettled: () => void invalidate(),
  })
}

export function returnOffline(tripId: number, body: OfflineReturnRequest) {
  return http.post<Trip>(`/trips/${tripId}/return/offline`, body)
}

export function useRateTrip() {
  const invalidate = useInvalidateRe()
  return useMutation({
    mutationFn: ({ tripId, body }: { tripId: number; body: RatingRequest }) =>
      http.post<void>(`/trips/${tripId}/rating`, body),
    onSettled: invalidate,
  })
}

export interface IncidentInput {
  targetType: IncidentTarget
  category: IncidentCategory
  description: string
  vehicleId?: number
  tripId?: number
  hubId?: number
  photos: File[]
}

export function useReportIncident() {
  return useMutation({
    mutationFn: (input: IncidentInput) => {
      const form = new FormData()
      form.append('targetType', input.targetType)
      form.append('category', input.category)
      form.append('description', input.description)
      if (input.vehicleId != null) form.append('vehicleId', String(input.vehicleId))
      if (input.tripId != null) form.append('tripId', String(input.tripId))
      if (input.hubId != null) form.append('hubId', String(input.hubId))
      for (const photo of input.photos) form.append('photos', photo)
      return http.postForm<Incident>('/incidents', form)
    },
  })
}
