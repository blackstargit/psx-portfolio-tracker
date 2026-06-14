'use client'

import { useState, useCallback, useRef } from 'react'
import type { PriceMap } from '@/types'
import { MANUAL_REFRESH_COOLDOWN } from '@/lib/constants'

export function usePrices() {
  const [prices, setPrices] = useState<PriceMap>({})
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [canRefresh, setCanRefresh] = useState(true)
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPrices = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/stocks/quote?symbols=${symbols.join(',')}`)
      if (!res.ok) return
      const data = await res.json()
      setPrices((prev) => ({ ...prev, ...data.prices }))
      setLastRefreshed(new Date())
    } catch {
      // silent — use cached prices
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    if (!canRefresh) return
    setLoading(true)
    setCanRefresh(false)

    try {
      const res = await fetch('/api/prices/refresh', { method: 'POST' })
      if (!res.ok) return
      const data = await res.json()
      if (data.prices) {
        setPrices((prev) => ({ ...prev, ...data.prices }))
        setLastRefreshed(new Date())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
      cooldownRef.current = setTimeout(() => setCanRefresh(true), MANUAL_REFRESH_COOLDOWN)
    }
  }, [canRefresh])

  const getPrice = useCallback((symbol: string) => prices[symbol] ?? null, [prices])

  return { prices, loading, lastRefreshed, canRefresh, fetchPrices, refreshAll, getPrice }
}
