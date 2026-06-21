import { NextResponse } from 'next/server'
import { fetchQuotes } from '@/lib/psx/quote'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()

  // Fetch all active stock symbols from DB
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select('symbol')
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 })
  }

  const symbols = (stocks ?? []).map((s) => s.symbol)

  if (symbols.length === 0) {
    return NextResponse.json({ refreshed: 0, failed: 0, prices: {} })
  }

  const result = await fetchQuotes(symbols)

  // Persist to DB cache
  const freshPrices = Object.values(result.prices).filter((p) => !p.stale)
  if (freshPrices.length > 0) {
    await supabase.from('price_cache').upsert(
      freshPrices.map((p) => ({
        symbol: p.symbol,
        price: p.price,
        currency: p.currency,
        market_state: p.market_state,
        fetched_at: p.fetched_at,
      })),
      { onConflict: 'symbol' }
    )
  }

  return NextResponse.json({
    refreshed: freshPrices.length,
    failed: result.errors.length,
    prices: result.prices,
    errors: result.errors,
  })
}
