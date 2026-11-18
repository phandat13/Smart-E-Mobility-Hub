import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/http'
import { reKeys, returnOffline } from './api'
import { POLL_MS } from './types'
import type { OfflineReturnRequest, Trip } from './types'

const KEY = 'unigo.re.offlineReturn'

export interface PendingOfflineReturn {
  tripId: number
  body: OfflineReturnRequest
}

export function loadPendingReturn(): PendingOfflineReturn | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PendingOfflineReturn) : null
  } catch {
    return null
  }
}

function savePendingReturn(p: PendingOfflineReturn | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p))
    else localStorage.removeItem(KEY)
  } catch {
    return
  }
}

interface SyncState {
  pending: PendingOfflineReturn | null
  syncing: boolean
  rejected: ApiError | null
}

export function useOfflineReturnSync(onSynced: (trip: Trip) => void) {
  const qc = useQueryClient()
  const [state, setState] = useState<SyncState>(() => ({ pending: loadPendingReturn(), syncing: false, rejected: null }))
  const pendingRef = useRef(state.pending)
  const busy = useRef(false)
  const onSyncedRef = useRef(onSynced)
  useEffect(() => {
    onSyncedRef.current = onSynced
  }, [onSynced])

  const trySync = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending || busy.current || !navigator.onLine) return
    busy.current = true
    setState((s) => ({ ...s, syncing: true }))
    try {
      const trip = await returnOffline(pending.tripId, pending.body)
      pendingRef.current = null
      savePendingReturn(null)
      setState({ pending: null, syncing: false, rejected: null })
      await qc.invalidateQueries({ queryKey: reKeys.all })
      if (trip) onSyncedRef.current(trip)
    } catch (e) {
      const err = e instanceof ApiError ? e : null
      if (err && err.status >= 400 && err.status < 500) {
        pendingRef.current = null
        savePendingReturn(null)
        setState({ pending: null, syncing: false, rejected: err })
      } else {
        setState((s) => ({ ...s, syncing: false }))
      }
    } finally {
      busy.current = false
    }
  }, [qc])

  const enqueue = useCallback(
    (p: PendingOfflineReturn) => {
      pendingRef.current = p
      savePendingReturn(p)
      setState({ pending: p, syncing: false, rejected: null })
      void trySync()
    },
    [trySync],
  )

  useEffect(() => {
    if (!state.pending) return
    const onOnline = () => void trySync()
    window.addEventListener('online', onOnline)
    const id = setInterval(onOnline, POLL_MS.offlineSync)
    const first = setTimeout(onOnline, 0)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(id)
      clearTimeout(first)
    }
  }, [state.pending, trySync])

  return { ...state, enqueue, trySync }
}
