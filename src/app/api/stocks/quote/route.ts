import { NextRequest, NextResponse } from 'next/server'
import { fetchQuotes } from '@/lib/psx/quote'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbolsParam = searchParams.get('symbols')

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols parameter is required' }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'No valid symbols provided' }, { status: 400 })
  }

  const result = await fetchQuotes(symbols)

  // Persist fresh prices to DB cache
  if (Object.keys(result.prices).length > 0) {
    try {
      const supabase = createServerSupabaseClient()
      const upserts = Object.values(result.prices)
        .filter((p) => !p.stale)
        .map((p) => ({
          symbol: p.symbol,
          price: p.price,
          currency: p.currency,
          market_state: p.market_state,
          fetched_at: p.fetched_at,
        }))

      if (upserts.length > 0) {
        await supabase
          .from('price_cache')
          .upsert(upserts, { onConflict: 'symbol' })
      }
    } catch {
      // Non-critical — continue even if DB cache write fails
    }
  }

  return NextResponse.json(result)
}
