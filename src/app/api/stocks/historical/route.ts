import { NextRequest, NextResponse } from 'next/server'
import { fetchHistory } from '@/lib/psx/historical'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { PSXOHLCV } from '@/lib/psx/types'

/**
 * GET /api/stocks/historical?symbol=HBL[&refresh=1]
 *
 * Returns daily OHLCV history for a single PSX symbol.
 * Result is cached once per calendar day in the `historical_cache` Supabase table.
 * Pass ?refresh=1 to bypass the cache and force a fresh PSX fetch.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const symbolParam = searchParams.get('symbol')
  const forceRefresh = searchParams.get('refresh') === '1'

  if (!symbolParam) {
    return NextResponse.json({ error: 'symbol parameter is required' }, { status: 400 })
  }

  const symbol = symbolParam.trim().toUpperCase().replace(/\.KA$/i, '')
  if (!symbol) {
    return NextResponse.json({ error: 'invalid symbol' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Try cache first (unless refresh forced)
  if (!forceRefresh) {
    try {
      const { data: cached } = await supabase
        .from('historical_cache')
        .select('data, fetched_at')
        .eq('symbol', symbol)
        .single()

      if (cached) {
        const fetchedAt = new Date(cached.fetched_at)
        const today = new Date()
        const sameDay =
          fetchedAt.getUTCFullYear() === today.getUTCFullYear() &&
          fetchedAt.getUTCMonth() === today.getUTCMonth() &&
          fetchedAt.getUTCDate() === today.getUTCDate()

        if (sameDay) {
          return NextResponse.json({
            symbol,
            bars: cached.data as PSXOHLCV[],
            fetchedAt: cached.fetched_at,
            fromCache: true,
          })
        }
      }
    } catch {
      // Cache miss or table doesn't exist yet — fall through to live fetch
    }
  }

  // Live fetch from PSX
  const result = await fetchHistory(symbol)

  // Persist to cache (best-effort — don't fail the response if this errors)
  try {
    await supabase.from('historical_cache').upsert(
      { symbol, data: result.bars, fetched_at: new Date().toISOString() },
      { onConflict: 'symbol' }
    )
  } catch {
    // Non-critical
  }

  return NextResponse.json({
    symbol,
    bars: result.bars,
    fetchedAt: new Date().toISOString(),
    fromCache: false,
  })
}
