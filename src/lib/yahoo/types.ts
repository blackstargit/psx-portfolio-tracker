export interface YahooQuote {
  symbol: string
  regularMarketPrice?: number
  currency?: string
  marketState?: string
}

export interface YahooSearchResult {
  symbol: string
  longname?: string
  shortname?: string
  exchange?: string
  quoteType?: string
}

export interface YahooDividendEvent {
  date: Date
  amount: number
}

export interface QuoteResult {
  prices: Record<string, {
    symbol: string
    price: number
    currency: string
    market_state: string
    fetched_at: string
    stale: boolean
  }>
  errors: string[]
}
