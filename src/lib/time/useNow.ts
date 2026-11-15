import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchServerTime } from '@/features/relationship/api'

/**
 * Difference between the server clock and this device's clock, measured once
 * per session. Display only (countdowns); unlocking is always decided by the
 * database clock (DR-03).
 */
export function useServerTimeOffset(): number {
  const { data } = useQuery({
    queryKey: ['server-time-offset'],
    queryFn: async () => {
      const requestedAt = Date.now()
      const serverTime = await fetchServerTime()
      const roundTrip = Date.now() - requestedAt
      return serverTime.getTime() + roundTrip / 2 - Date.now()
    },
    staleTime: Infinity,
    retry: false,
  })
  return data ?? 0
}

/**
 * Current time (server-calibrated), re-rendering at each minute boundary, or
 * every second when `precision` is 'second'.
 */
export function useNow(precision: 'minute' | 'second' = 'minute'): Date {
  const offset = useServerTimeOffset()
  const [deviceNow, setDeviceNow] = useState(() => Date.now())

  useEffect(() => {
    const step = precision === 'second' ? 1000 : 60_000
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const delay = step - (Date.now() % step) + 20
      timer = setTimeout(() => {
        setDeviceNow(Date.now())
        schedule()
      }, delay)
    }
    schedule()
    // Phones suspend timers in the background; catch up when visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setDeviceNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [precision])

  return new Date(deviceNow + offset)
}
