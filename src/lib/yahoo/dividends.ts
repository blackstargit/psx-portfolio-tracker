import yahooFinance from './client'
import type { YahooDividendEvent } from './types'

export async function fetchDividends(
  symbol: string,
  fromDate?: string
): Promise<YahooDividendEvent[]> {
  try {
    const period1 = fromDate ?? '2020-01-01'
    const result = await yahooFinance.historical(symbol, {
      period1,
      events: 'dividends',
    })

    return result
      .filter((event) => (event as { dividends?: number }).dividends != null)
      .map((event) => ({
        date: event.date,
        amount: (event as { dividends?: number }).dividends ?? 0,
      }))
  } catch {
    return []
  }
}
