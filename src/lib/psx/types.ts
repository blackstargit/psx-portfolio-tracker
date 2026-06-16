// Public result types for the PSX scraper layer (src/lib/psx/*.ts).
// Mirror the shapes the API routes + frontend already consume.

export interface PSXPriceEntry {
  symbol: string
  price: number
  currency: string
  market_state: string
  fetched_at: string
  stale: boolean
}

export interface PSXQuoteResult {
  prices: Record<string, PSXPriceEntry>
  errors: string[]
}

export interface PSXSearchResult {
  symbol: string
  name: string
  exchange: string
}

export interface PSXDividendEvent {
  date: string        // ISO date string YYYY-MM-DD
  type: 'cash' | 'bonus'
  dividend_type: string  // e.g. "FINAL", "INTERIM", "BONUS"
}