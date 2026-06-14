'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Dividend } from '@/types'

export function useDividends(stockId?: string) {
  const [dividends, setDividends] = useState<Dividend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('dividends')
      .select('*, stock:stocks(symbol, name)')
      .order('ex_date', { ascending: false })

    if (stockId) {
      query = query.eq('stock_id', stockId)
    }

    const { data, error } = await query
    if (error) setError(error.message)
    else setDividends(data as Dividend[])
    setLoading(false)
  }, [stockId])

  useEffect(() => { fetch() }, [fetch])

  const addDividend = async (values: {
    stock_id: string
    ex_date: string
    payment_date?: string | null
    amount_per_share: number
    dividend_type?: 'cash' | 'bonus' | 'special'
    source?: 'yahoo' | 'manual'
    notes?: string
  }) => {
    const { error } = await supabase.from('dividends').insert({
      ...values,
      source: values.source ?? 'manual',
      dividend_type: values.dividend_type ?? 'cash',
    })
    if (error) throw new Error(error.message)
    await fetch()
  }

  const updateDividend = async (id: string, values: Partial<Omit<Dividend, 'id' | 'stock_id' | 'created_at' | 'stock'>>) => {
    // Mark as manually edited when updated
    const { error } = await supabase
      .from('dividends')
      .update({ ...values, source: 'manual' })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const deleteDividend = async (id: string) => {
    const { error } = await supabase.from('dividends').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  // Bulk upsert from Yahoo Finance fetch
  const upsertFromYahoo = async (
    stockId: string,
    items: Array<{ ex_date: string; amount_per_share: number; dividend_type?: 'cash' | 'bonus' | 'special' }>
  ) => {
    const upserts = items.map((item) => ({
      stock_id: stockId,
      ex_date: item.ex_date,
      amount_per_share: item.amount_per_share,
      dividend_type: item.dividend_type ?? 'cash',
      source: 'yahoo' as const,
    }))

    const { error } = await supabase
      .from('dividends')
      .upsert(upserts, { onConflict: 'stock_id,ex_date,dividend_type', ignoreDuplicates: false })
    if (error) throw new Error(error.message)
    await fetch()
  }

  return { dividends, loading, error, addDividend, updateDividend, deleteDividend, upsertFromYahoo, refetch: fetch }
}
