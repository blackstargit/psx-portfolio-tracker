import { CURRENCY_SYMBOL } from './constants'

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${CURRENCY_SYMBOL} ${value.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('en-PK')
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric',
  })
}

export function formatMonthShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    month: 'short',
    year: 'numeric',
  })
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${CURRENCY_SYMBOL} ${value.toFixed(2)}`
}

// Returns ISO date string for the first day of a given month
export function monthToDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

// Returns { year, month } from a "YYYY-MM-DD" date string
export function parsePlanMonth(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y, month: m }
}
