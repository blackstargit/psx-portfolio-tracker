/**
 * PSX endpoint URLs, request headers, retry config, and column mappings.
 *
 * Ported from the reference `psxdata` library (foreign-repos/psxdata) — only the
 * data-refinement principles, not the library itself. PSX serves plain AJAX
 * endpoints at dps.psx.com.pk that we scrape with fetch + cheerio.
 */

export const BASE_URL = 'https://dps.psx.com.pk'

export const ENDPOINTS = {
  // Live trading board — one (market, board) per call. REG/main = regular main board.
  trading_board: '/trading-board',
  // Full screener table (~729 symbols) — fundamentals-oriented, last price only.
  screener: '/screener',
  // Full instrument list as JSON (~1029 symbols) with sector names + type flags.
  symbols: '/symbols',
  // Financial report filings list (dividend/bonus declarations — dates/types only).
  financial_reports: '/financial-reports-list',
  // Per-symbol OHLCV history (POST with form data {symbol}). Returns all history;
  // PSX ignores any date params — filter in memory after parsing.
  historical: '/historical',
} as const

// Single well-formed User-Agent — PSX showed no UA-based blocking. These headers
// (esp. X-Requested-With + Referer) make the AJAX endpoints return their fragments.
export const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  Referer: 'https://dps.psx.com.pk/',
  'X-Requested-With': 'XMLHttpRequest',
}

export const REQUEST_TIMEOUT_MS = 30_000

export const MAX_RETRIES = 3
// Delays before retries 2 and 3 (no sleep after the final attempt).
export const RETRY_DELAYS_MS = [1_000, 2_000] as const

// Live trading board + symbols list are cached in-memory for 15 min, matching the
// reference library's behaviour. Avoids re-fetching the whole board per symbol.
export const CACHE_TTL_MS = 15 * 60 * 1000

// PSX trading-board live-quote source. REG = regular market, main = main board.
export const QUOTE_MARKET = 'REG'
export const QUOTE_BOARD = 'main'

/**
 * Raw PSX <th> header text -> internal snake_case column name.
 * Unknown headers fall back to normalizeColumnName(). Ported from
 * psxdata/constants.py COLUMN_MAP (only the columns we consume + their siblings).
 */
export const COLUMN_MAP: Record<string, string> = {
  // Trading board (live quotes)
  SYMBOL: 'symbol',
  LDCP: 'ldcp',
  CURRENT: 'current',
  Current: 'current',
  CHANGE: 'change',
  'CHANGE (%)': 'change_pct',
  '% Change': 'change_pct',
  VOLUME: 'volume',
  // Screener
  SECTOR: 'sector',
  'LISTED IN': 'listed_in',
  'MARKET CAP.': 'market_cap',
  PRICE: 'price',
  // Financial reports (dividends)
  SYMBOL_: 'symbol',
  NAME: 'name',
  Name: 'name',
  Symbol: 'symbol',
  YEAR: 'year',
  TYPE: 'type',
  'PERIOD ENDED': 'period_ended',
  'POSTING DATE': 'posting_date',
  'POSTING TIME': 'posting_time',
  DOCUMENT: 'document',
  // Historical OHLCV (POST /historical)
  DATE: 'date',
  'DATE ': 'date',   // PSX header has a trailing space
  OPEN: 'open',
  HIGH: 'high',
  LOW: 'low',
  CLOSE: 'close',
}
