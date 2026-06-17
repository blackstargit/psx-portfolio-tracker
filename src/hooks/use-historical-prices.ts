'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PSXOHLCV } from '@/lib/psx/types'

interface HistoricalPricesState {
  bars: PSXOHLCV[]
  loading: boolean
  error: string | null
  fetchedAt: string | null
  fromCache: boolean
}

export function useHistoricalPrices(symbol: string | undefined) {
  const [state, setState] = useState<HistoricalPricesState>({
    bars: [],
    loading: false,
    error: null,
    fetchedAt: null,
    fromCache: false,
  })

  const fetchBars = useCallback(
    async (forceRefresh = false) => {
      if (!symbol) return
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const url = `/api/stocks/historical?symbol=${encodeURIComponent(symbol)}${forceRefresh ? '&refresh=1' : ''}`
        const res = await fetch(url)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        setState({
          bars: data.bars ?? [],
          loading: false,
          error: null,
          fetchedAt: data.fetchedAt ?? null,
          fromCache: data.fromCache ?? false,
        })
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load history',
        }))
      }
    },
    [symbol]
  )

  useEffect(() => {
    fetchBars()
  }, [fetchBars])

  return {
    ...state,
    /** Force a fresh PSX fetch, bypassing the daily cache. */
    refresh: () => fetchBars(true),
  }
}
