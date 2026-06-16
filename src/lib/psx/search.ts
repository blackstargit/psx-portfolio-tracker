/**
 * PSX stock search via the /symbols JSON endpoint.
 *
 * GET /symbols returns ~1029 instruments as JSON with sector names and type flags.
 * We fetch the full list once (cached 15 min in-memory) and filter it locally by
 * symbol / name / sector — matching the reference library's SymbolsScraper shape.
 *
 * (The previous Python wrapper called psxdata.tickers(), which returns a plain list
 * of strings, then treated it as a DataFrame — so search always returned []. This
 * uses the underlying /symbols payload directly, fixing that.)
 */
import { psxGetJson } from './http'
import { CACHE_TTL_MS } from './constants'
import type { PSXSearchResult } from './types'

// Raw shape of each entry from PSX /symbols (keys as PSX sends them).
interface RawSymbol {
  symbol?: string
  name?: string
  sectorName?: string
  isETF?: boolean
  isDebt?: boolean
  isGEM?: boolean
}

let symbolsCache: { rows: RawSymbol[]; at: number } | null = null

async function getSymbols(): Promise<RawSymbol[]> {
  if (symbolsCache && Date.now() - symbolsCache.at < CACHE_TTL_MS) {
    return symbolsCache.rows
  }
  const data = await psxGetJson<RawSymbol[]>('symbols')
  const rows = Array.isArray(data) ? data : []
  if (rows.length > 0) symbolsCache = { rows, at: Date.now() }
  return rows
}

export async function searchPSXStocks(query: string, limit = 10): Promise<PSXSearchResult[]> {
  const q = query?.trim().toLowerCase()
  if (!q) return []

  let rows: RawSymbol[]
  try {
    rows = await getSymbols()
  } catch (err) {
    console.error('[psx/search] symbols fetch failed:', err)
    return []
  }

  const matches: PSXSearchResult[] = []
  for (const row of rows) {
    if (row.isETF || row.isDebt) continue
    const symbol = (row.symbol ?? '').trim()
    if (!symbol) continue
    const name = (row.name ?? symbol).trim()
    const sector = (row.sectorName ?? '').toLowerCase()

    if (
      symbol.toLowerCase().includes(q) ||
      name.toLowerCase().includes(q) ||
      sector.includes(q)
    ) {
      // Return the plain symbol (no .KA) — the add-stock dialog re-applies the suffix.
      matches.push({
        symbol: symbol.replace(/\.KA$/i, ''),
        name,
        exchange: 'KAR',
      })
      if (matches.length >= limit) break
    }
  }

  return matches
}
