/**
 * PSX per-company payout history via POST /company/payouts.
 *
 * The endpoint returns an HTML table with columns:
 *   Date | Financial Results | Details | Book Closure
 *
 * "Details" encodes the payout as "{pct}%({interim}) ({type})", e.g.:
 *   "60%(i) (D)"   → 60% of face value, first interim, cash dividend
 *   "42.5%(F) (D)" → 42.5%, final, cash dividend
 *   "50% (R)"      → rights issue — skipped, not a cash/bonus event
 *
 * Most PSX stocks have Rs 10 face value, so pct/100 × 10 = per-share amount.
 * Companies with a different par value (Rs 5, Rs 2.5) will be slightly off;
 * users can correct via the manual-edit button in the dividends UI.
 *
 * The ex-date is taken as the Book Closure start date (the first date in the
 * "DD/MM/YYYY - DD/MM/YYYY" range shown by PSX).
 */
import * as cheerio from 'cheerio'
import { BASE_URL, CACHE_TTL_MS } from './constants'
import { psxPost, buildUrl } from './http'
import type { PSXDividendEvent } from './types'

const DEFAULT_FACE_VALUE = 10 // PKR — par value for the majority of PSX listings

const cache = new Map<string, { events: PSXDividendEvent[]; at: number }>()

function parseBookClosureStart(text: string): string | null {
  // "29/04/2026  - 30/04/2026 " → "2026-04-29"
  const first = text.split('-')[0].trim()
  const m = first.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function parseDetails(text: string): {
  amount: number | null
  type: 'cash' | 'bonus' | null
} {
  const m = text.match(/([\d.]+)%.*\(([DBR])\)/)
  if (!m) return { amount: null, type: null }
  const code = m[2]
  if (code === 'R') return { amount: null, type: null } // rights issue — not a payout
  const pct = parseFloat(m[1])
  return {
    amount: Math.round((pct / 100) * DEFAULT_FACE_VALUE * 100) / 100,
    type: code === 'B' ? 'bonus' : 'cash',
  }
}

export async function fetchPayouts(symbol: string): Promise<PSXDividendEvent[]> {
  const sym = symbol.trim().toUpperCase()
  if (!sym) return []

  const hit = cache.get(sym)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.events

  let html: string
  try {
    html = await psxPost(
      buildUrl('company_payouts'),
      { symbol: sym },
      { Referer: `${BASE_URL}/company/${sym}` }
    )
  } catch (err) {
    console.error('[psx/payouts] fetch failed:', err)
    return []
  }

  const $ = cheerio.load(html)
  const events: PSXDividendEvent[] = []

  $('tbody tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length < 4) return

    const detailsText = $(cells[2]).text().trim()
    const closureText = $(cells[3]).text().trim()

    const { amount, type } = parseDetails(detailsText)
    if (!type) return

    const exDate = parseBookClosureStart(closureText)
    if (!exDate) return

    events.push({
      date: exDate,
      type,
      dividend_type: detailsText,
      amount_per_share: amount,
    })
  })

  if (events.length > 0) cache.set(sym, { events, at: Date.now() })
  return events
}
