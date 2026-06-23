/**
 * PSX dividend / bonus events via the financial reports filing list.
 *
 * GET /financial-reports-list returns all filings as an HTML table with columns:
 * symbol, year, type, period_ended, posting_date, posting_time, document.
 * PSX exposes the report TYPE and dates but NOT the per-share amount — the caller
 * must enter amounts manually (this is a PSX data limitation, not a bug).
 *
 * We fetch the full list once (cached 15 min), filter by symbol, and classify each
 * filing as a cash or bonus event by its type text.
 */
import { psxGet, buildUrl } from './http'
import { parseHtmlTable, type TableRow } from './html-table'
import { parseDateToISO } from './normalizers'
import { CACHE_TTL_MS } from './constants'
import type { PSXDividendEvent } from './types'

// Report-type keywords (matched as substrings, case-insensitive).
const CASH_TYPES = [
  'FINAL', 'INTERIM', 'FIRST INTERIM', 'SECOND INTERIM', 'THIRD INTERIM',
  'FOURTH INTERIM', 'SPECIAL', 'DIVIDEND', 'CASH DIVIDEND',
]
const BONUS_TYPES = ['BONUS', 'RIGHT', 'STOCK DIVIDEND', 'SHARE PREMIUM']

let reportsCache: { rows: TableRow[]; at: number } | null = null

async function getReports(): Promise<TableRow[]> {
  if (reportsCache && Date.now() - reportsCache.at < CACHE_TTL_MS) {
    return reportsCache.rows
  }
  const html = await psxGet(buildUrl('financial_reports'))
  const rows = parseHtmlTable(html)
  // The list is legitimately empty outside reporting season — only cache hits.
  if (rows.length > 0) reportsCache = { rows, at: Date.now() }
  return rows
}

function classify(typeText: string): 'cash' | 'bonus' | null {
  const t = typeText.toUpperCase()
  if (BONUS_TYPES.some((b) => t.includes(b))) return 'bonus'
  if (CASH_TYPES.some((c) => t.includes(c))) return 'cash'
  return null
}

export async function fetchDividends(
  symbol: string,
  fromDate?: string
): Promise<PSXDividendEvent[]> {
  const sym = symbol?.trim().toUpperCase()
  if (!sym) return []

  let rows: TableRow[]
  try {
    rows = await getReports()
  } catch (err) {
    console.error('[psx/dividends] reports fetch failed:', err)
    return []
  }

  const events: PSXDividendEvent[] = []
  for (const row of rows) {
    if ((row.symbol ?? '').trim().toUpperCase() !== sym) continue

    const rawType = (row.type ?? '').trim()
    const kind = classify(rawType)
    if (!kind) continue

    // posting_date is the filing/ex date; fall back to period_ended.
    const date = parseDateToISO(row.posting_date) ?? parseDateToISO(row.period_ended)
    if (!date) continue
    if (fromDate && date < fromDate) continue

    events.push({ date, type: kind, dividend_type: rawType || kind, amount_per_share: null })
  }

  // Newest first.
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return events
}

