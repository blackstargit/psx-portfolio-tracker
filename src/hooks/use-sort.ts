'use client'

import { useState } from 'react'

export type SortDir = 'asc' | 'desc'

export interface SortState {
  /** Active column key, or null when unsorted (original order preserved). */
  key: string | null
  dir: SortDir
}

/** A sort value: numbers/dates compare numerically, strings alphabetically. */
export type SortValue = string | number | null | undefined

/**
 * Header-click sort state. First click on a column sorts ascending; clicking the
 * same column again flips to descending. Clicking a different column resets to asc.
 */
export function useSort(initial: SortState = { key: null, dir: 'asc' }) {
  const [sort, setSort] = useState<SortState>(initial)

  const toggle = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  return { sort, toggle }
}

/**
 * Returns a new array sorted by `sort`. `getValue` maps a row + column key to the
 * value to compare. Numbers (incl. date timestamps) sort numerically; everything
 * else sorts as a locale-aware string. Empty/null values always sink to the bottom
 * regardless of direction. When `sort.key` is null the input order is preserved.
 */
export function sortRows<T>(
  rows: T[],
  sort: SortState,
  getValue: (row: T, key: string) => SortValue
): T[] {
  if (!sort.key) return rows
  const { key, dir } = sort

  return [...rows].sort((a, b) => {
    const va = getValue(a, key)
    const vb = getValue(b, key)

    const aEmpty = va == null || va === ''
    const bEmpty = vb == null || vb === ''
    if (aEmpty && bEmpty) return 0
    if (aEmpty) return 1
    if (bEmpty) return -1

    let cmp: number
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb
    } else {
      cmp = String(va).localeCompare(String(vb), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    }
    return dir === 'asc' ? cmp : -cmp
  })
}
