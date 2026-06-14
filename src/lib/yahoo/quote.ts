import yahooFinance from './client'
import type { QuoteResult } from './types'
import {
  PRICE_CACHE_TTL_MARKET_HOURS,
  PRICE_CACHE_TTL_AFTER_HOURS,
  PSX_MARKET_OPEN_HOUR,
  PSX_MARKET_OPEN_MINUTE,
  PSX_MARKET_CLOSE_HOUR,
  PSX_MARKET_CLOSE_MINUTE,
  PSX_UTC_OFFSET,
} from '../constants'

// In-memory cache for the lifetime of the server process
const memCache = new Map<string, { price: number; currency: string; market_state: string; fetched_at: Date }>()

function isPSXMarketOpen(): boolean {
  const now = new Date()
  const pktHours = (now.getUTCHours() + PSX_UTC_OFFSET) % 24
  const pktMinutes = now.getUTCMinutes()
  const pktDay = now.getUTCDay() // 0=Sun, 6=Sat
  if (pktDay === 0 || pktDay === 6) return false
  const openMinutes = PSX_MARKET_OPEN_HOUR * 60 + PSX_MARKET_OPEN_MINUTE
  const closeMinutes = PSX_MARKET_CLOSE_HOUR * 60 + PSX_MARKET_CLOSE_MINUTE
  const currentMinutes = pktHours * 60 + pktMinutes
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

function getCacheTTL(): number {
  return isPSXMarketOpen() ? PRICE_CACHE_TTL_MARKET_HOURS : PRICE_CACHE_TTL_AFTER_HOURS
}

function isMemCacheValid(symbol: string): boolean {
  const entry = memCache.get(symbol)
  if (!entry) return false
  return Date.now() - entry.fetched_at.getTime() < getCacheTTL()
}

export async function fetchQuotes(symbols: string[]): Promise<QuoteResult> {
  const result: QuoteResult = { prices: {}, errors: [] }

  // Separate cached vs stale symbols
  const symbolsToFetch: string[] = []
  for (const symbol of symbols) {
    if (isMemCacheValid(symbol)) {
      const cached = memCache.get(symbol)!
      result.prices[symbol] = {
        symbol,
        price: cached.price,
        currency: cached.currency,
        market_state: cached.market_state,
        fetched_at: cached.fetched_at.toISOString(),
        stale: false,
      }
    } else {
      symbolsToFetch.push(symbol)
    }
  }

  if (symbolsToFetch.length === 0) return result

  try {
    // Batch fetch all stale symbols
    const quotes = Array.isArray(symbolsToFetch) && symbolsToFetch.length === 1
      ? [await yahooFinance.quote(symbolsToFetch[0])]
      : await Promise.all(symbolsToFetch.map((s) => yahooFinance.quote(s).catch(() => null)))

    for (let i = 0; i < symbolsToFetch.length; i++) {
      const symbol = symbolsToFetch[i]
      const quote = quotes[i]

      if (quote && quote.regularMarketPrice != null) {
        const entry = {
          price: quote.regularMarketPrice,
          currency: quote.currency ?? 'PKR',
          market_state: quote.marketState ?? 'UNKNOWN',
          fetched_at: new Date(),
        }
        memCache.set(symbol, entry)
        result.prices[symbol] = {
          symbol,
          price: entry.price,
          currency: entry.currency,
          market_state: entry.market_state,
          fetched_at: entry.fetched_at.toISOString(),
          stale: false,
        }
      } else {
        // Return stale cache if available, otherwise error
        const staleEntry = memCache.get(symbol)
        if (staleEntry) {
          result.prices[symbol] = {
            symbol,
            price: staleEntry.price,
            currency: staleEntry.currency,
            market_state: staleEntry.market_state,
            fetched_at: staleEntry.fetched_at.toISOString(),
            stale: true,
          }
        } else {
          result.errors.push(symbol)
        }
      }
    }
  } catch {
    // Entire fetch failed — return stale cache for all
    for (const symbol of symbolsToFetch) {
      const staleEntry = memCache.get(symbol)
      if (staleEntry) {
        result.prices[symbol] = {
          symbol,
          price: staleEntry.price,
          currency: staleEntry.currency,
          market_state: staleEntry.market_state,
          fetched_at: staleEntry.fetched_at.toISOString(),
          stale: true,
        }
      } else {
        result.errors.push(symbol)
      }
    }
  }

  return result
}
