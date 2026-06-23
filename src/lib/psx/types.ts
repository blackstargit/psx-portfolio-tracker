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
  date: string              // ISO date YYYY-MM-DD (book-closure start = ex-date)
  type: 'cash' | 'bonus'
  dividend_type: string     // raw Details cell, e.g. "60%(i) (D)"
  amount_per_share: number | null  // pct/100 * Rs 10 face value; null if unparseable
}

/** One daily OHLCV bar returned by POST /historical. */
export interface PSXOHLCV {
  date: string    // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface PSXHistoryResult {
  symbol: string
  bars: PSXOHLCV[]  // sorted ascending by date (oldest first)
}
