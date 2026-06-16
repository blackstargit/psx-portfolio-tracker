/**
 * Dynamic HTML table parser for PSX pages — cheerio port of psxdata/parsers/html.py.
 *
 * Extracts the first <table> without assuming fixed column positions. Headers are
 * mapped via COLUMN_MAP; unknown headers fall back to normalizeColumnName.
 * All values are returned as raw strings — callers apply coerceNumeric / parseDate.
 */
import * as cheerio from 'cheerio'
import { COLUMN_MAP } from './constants'
import { normalizeColumnName } from './normalizers'

export type TableRow = Record<string, string>

/**
 * Parse the first HTML table in `html`, returning rows as dicts keyed by
 * normalised column name. Returns [] for empty/malformed HTML or a table
 * with no <th> headers.
 */
export function parseHtmlTable(html: string): TableRow[] {
  const $ = cheerio.load(html)
  const table = $('table').first()
  if (table.length === 0) return []

  const headers: string[] = []
  table
    .find('th')
    .each((_, th) => {
      const raw = $(th).text().trim()
      headers.push(COLUMN_MAP[raw] ?? normalizeColumnName(raw))
    })
  if (headers.length === 0) return []

  const tbody = table.find('tbody')
  const trs = tbody.length ? tbody.find('tr') : table.find('tr')

  const rows: TableRow[] = []
  trs.each((_, tr) => {
    const cells = $(tr)
      .find('td')
      .map((_i, td) => $(td).text().trim())
      .get()
    if (cells.length === 0) return
    const row: TableRow = {}
    const n = Math.min(headers.length, cells.length)
    for (let i = 0; i < n; i++) row[headers[i]] = cells[i]
    rows.push(row)
  })

  return rows
}
