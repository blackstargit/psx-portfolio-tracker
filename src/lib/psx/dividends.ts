import { runPython } from './runner'
import type { PSXDividendEvent } from './types'

export async function fetchDividends(
  symbol: string,
  fromDate?: string
): Promise<PSXDividendEvent[]> {
  if (!symbol) return []

  try {
    const args = [symbol]
    if (fromDate) {
      args.push('--from', fromDate)
    }
    const output = await runPython('psx_dividends', args)
    return JSON.parse(output) as PSXDividendEvent[]
  } catch (err) {
    console.error('[psx/dividends] fetchDividends failed:', err)
    return []
  }
}