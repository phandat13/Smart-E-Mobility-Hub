import { useEffect, useState } from 'react'
import { serverNow } from '../api/http'

/** Giờ server (ms), cập nhật mỗi `intervalMs`. Dùng cho đồng hồ đếm ngược. */
export function useServerNow(intervalMs = 1000): number {
  const [now, setNow] = useState(serverNow)

  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
