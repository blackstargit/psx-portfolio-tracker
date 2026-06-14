import yahooFinance from './client'
import { PSX_SYMBOL_SUFFIX } from '../constants'

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string
}

export async function searchPSXStocks(query: string): Promise<StockSearchResult[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const results = await yahooFinance.search(query.trim())
    const quotes = results.quotes ?? []

    return quotes
      .filter(
        (q: Record<string, unknown>) =>
          typeof q.symbol === 'string' &&
          q.symbol.endsWith(PSX_SYMBOL_SUFFIX) &&
          (q.quoteType === 'EQUITY' || q.quoteType === 'MUTUALFUND')
      )
      .map((q: Record<string, unknown>) => ({
        symbol: q.symbol as string,
        name: (q.longname as string) ?? (q.shortname as string) ?? (q.symbol as string),
        exchange: (q.exchange as string) ?? 'KAR',
      }))
      .slice(0, 10)
  } catch {
    return []
  }
}
