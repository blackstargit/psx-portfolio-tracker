/**
 * Pure data-normalisation helpers, ported from psxdata/parsers/normalizers.py.
 * No I/O — just string -> typed-value coercion. None of these ever throw.
 */

const PSX_DATE_FORMATS = [
  // "Jun 16, 2026"
  /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/,
  // "16-Jun-2026"
  /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/,
  // "2026-06-16"
  /^(\d{4})-(\d{2})-(\d{2})$/,
  // "16/06/2026"
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
] as const

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/**
 * Parse a PSX date cell into an ISO date string (YYYY-MM-DD), or null.
 * Tries the known PSX formats, then falls back to Date.parse.
 */
export function parseDateToISO(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (!s || s.toLowerCase() === 'nan') return null

  // "Mon DD, YYYY"
  let m = s.match(PSX_DATE_FORMATS[0])
  if (m) {
    const month = MONTHS[m[1].toLowerCase()]
    if (month !== undefined) return iso(+m[3], month, +m[2])
  }
  // "DD-Mon-YYYY"
  m = s.match(PSX_DATE_FORMATS[1])
  if (m) {
    const month = MONTHS[m[2].toLowerCase()]
    if (month !== undefined) return iso(+m[3], month, +m[1])
  }
  // "YYYY-MM-DD"
  m = s.match(PSX_DATE_FORMATS[2])
  if (m) return iso(+m[1], +m[2] - 1, +m[3])
  // "DD/MM/YYYY"
  m = s.match(PSX_DATE_FORMATS[3])
  if (m) return iso(+m[3], +m[2] - 1, +m[1])

  // Fallback — let the runtime try (handles ISO datetimes etc.)
  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    return iso(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }
  return null
}

function iso(year: number, monthIdx: number, day: number): string | null {
  const d = new Date(Date.UTC(year, monthIdx, day))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/**
 * Coerce a raw PSX cell to a number, stripping commas, %, PKR and whitespace.
 * Returns null for unparseable input.
 */
export function coerceNumeric(value: unknown): number | null {
  if (typeof value !== 'string') {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  const cleaned = value.trim().replace(/,/g, '').replace(/%/g, '').replace(/PKR/gi, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Normalize a raw PSX <th> header to a snake_case identifier (fallback path). */
export function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}
