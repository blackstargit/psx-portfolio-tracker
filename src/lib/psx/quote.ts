/**
 * Live PSX quotes via the full screener table.
 *
 * Endpoint: GET /screener — returns ~735 symbols (broader coverage than any single
 * trading board, which omits inactive scrips like ENGRO) with an explicit `price`
 * column holding the latest traded price. We fetch the whole table once (cached
 * 15 min in-memory) and filter requested symbols locally — the "fetch-all,
 * filter-locally" strategy from the reference library.
 */
import { psxGet, buildUrl } from './http'
import { parseHtmlTable } from './html-table'
import { coerceNumeric } from './normalizers'
import { CACHE_TTL_MS } from './constants'
import type { PSXQuoteResult, PSXPriceEntry } from './types'

interface ScreenerRow {
  symbol: string
  price: number | null
}

let boardCache: { rows: Map<string, ScreenerRow>; at: number } | null = null

/** Strip the optional `.KA` suffix and upper-case a symbol for lookup. */
function plain(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.KA$/i, '')
}

async function getBoard(): Promise<Map<string, ScreenerRow>> {
  if (boardCache && Date.now() - boardCache.at < CACHE_TTL_MS) {
    return boardCache.rows
  }

  const html = await psxGet(buildUrl('screener'))
  const rows = parseHtmlTable(html)

  const map = new Map<string, ScreenerRow>()
  for (const r of rows) {
    const sym = (r.symbol ?? '').trim().toUpperCase()
    if (!sym) continue
    map.set(sym, { symbol: sym, price: coerceNumeric(r.price) })
  }

  // Only cache a non-empty table — an empty parse is treated as a transient failure.
  if (map.size > 0) boardCache = { rows: map, at: Date.now() }
  return map
}

/**
 * True when PSX is in a regular trading session: Mon–Fri, 09:30–15:30 PKT (UTC+5),
 * i.e. 04:30–10:30 UTC. Used to label market_state when we can't infer it otherwise.
 */
function isMarketOpen(now = new Date()): boolean {
  const utcDay = now.getUTCDay() // 0 = Sun, 6 = Sat
  if (utcDay === 0 || utcDay === 6) return false
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const open = 4 * 60 + 30 // 04:30 UTC
  const close = 10 * 60 + 30 // 10:30 UTC
  return minutes >= open && minutes <= close
}

export async function fetchQuotes(symbols: string[]): Promise<PSXQuoteResult> {
  const result: PSXQuoteResult = { prices: {}, errors: [] }
  if (symbols.length === 0) return result

  let board: Map<string, ScreenerRow>
  try {
    board = await getBoard()
  } catch (err) {
    console.error('[psx/quote] screener fetch failed:', err)
    // Whole-table failure — report every symbol as an error so callers fall back
    // to the Supabase price cache.
    result.errors = symbols.map((s) => plain(s))
    return result
  }

  const marketState = isMarketOpen() ? 'REGULAR' : 'CLOSED'
  const fetchedAt = new Date().toISOString()

  for (const requested of symbols) {
    const sym = plain(requested)
    const row = board.get(sym)
    const price = row?.price && row.price > 0 ? row.price : null

    if (!row || price === null) {
      result.errors.push(sym)
      continue
    }

    const entry: PSXPriceEntry = {
      symbol: sym,
      price,
      currency: 'PKR',
      market_state: marketState,
      fetched_at: fetchedAt,
      stale: false,
    }
    // Key by `.KA` form so the frontend (which holds DB symbols like "HBL.KA")
    // can look prices up directly.
    result.prices[`${sym}.KA`] = entry
  }

  return result
}
