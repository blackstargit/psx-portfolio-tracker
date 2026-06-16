import { runPython } from './runner'
import type { PSXSearchResult } from './types'

export async function searchPSXStocks(query: string): Promise<PSXSearchResult[]> {
  if (!query || query.trim().length < 1) return []

  try {
    const output = await runPython('psx_search', [query.trim()])
    return JSON.parse(output) as PSXSearchResult[]
  } catch (err) {
    console.error('[psx/search] searchPSXStocks failed:', err)
    return []
  }
}