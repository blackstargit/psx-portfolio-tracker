import { runPython } from './runner'
import type { PSXQuoteResult } from './types'

export async function fetchQuotes(symbols: string[]): Promise<PSXQuoteResult> {
  const result: PSXQuoteResult = { prices: {}, errors: [] }

  if (symbols.length === 0) return result

  try {
    const output = await runPython('psx_quote', [symbols.join(',')])
    const parsed = JSON.parse(output) as PSXQuoteResult

    result.prices = parsed.prices ?? {}
    result.errors = parsed.errors ?? []
  } catch (err) {
    console.error('[psx/quote] fetchQuotes failed:', err)
    // Return all as errors so callers fall back to DB cache
    for (const sym of symbols) {
      result.errors.push(sym)
    }
  }

  return result
}