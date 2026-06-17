/**
 * PSX per-symbol OHLCV history via POST /historical.
 *
 * The endpoint always returns the full available history for a symbol regardless
 * of any date params passed — PSX ignores them server-side. We fetch the whole
 * table and return it sorted oldest→newest (required by lightweight-charts).
 *
 * Ported from foreign-repos/psxdata/psxdata/scrapers/historical.py.
 */
import { psxPost, buildUrl } from './http'
import { parseHtmlTable } from './html-table'
import { coerceNumeric, parseDateToISO } from './normalizers'
import type { PSXHistoryResult, PSXOHLCV } from './types'

/** Strip optional .KA suffix and upper-case. */
function plain(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.KA$/i, '')
}

export async function fetchHistory(symbol: string): Promise<PSXHistoryResult> {
  const sym = plain(symbol)
  const url = buildUrl('historical')

  const html = await psxPost(url, { symbol: sym })
  const rows = parseHtmlTable(html)

  const bars: PSXOHLCV[] = []
  for (const r of rows) {
    const date = parseDateToISO(r.date ?? r['date '])
    const open = coerceNumeric(r.open)
    const high = coerceNumeric(r.high)
    const low = coerceNumeric(r.low)
    const close = coerceNumeric(r.close)
    const volume = coerceNumeric(r.volume)

    // Drop rows with unparseable date or missing close — everything else is optional
    if (!date || close === null) continue

    bars.push({
      date,
      open: open ?? close,
      high: high ?? close,
      low: low ?? close,
      close,
      volume: volume ?? 0,
    })
  }

  // PSX returns newest-first; lightweight-charts needs oldest-first
  bars.sort((a, b) => a.date.localeCompare(b.date))

  return { symbol: sym, bars }
}
