'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Stock } from '@/types'

export function useStocks() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('stocks')
      .select('*, sector:sectors(*)')
      .eq('is_active', true)
      .order('symbol', { ascending: true })
    if (error) setError(error.message)
    else setStocks(data as Stock[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const createStock = async (values: {
    symbol: string
    name: string
    sector_id: string
    notes?: string
  }) => {
    const { error } = await supabase.from('stocks').insert({
      ...values,
      symbol: values.symbol.toUpperCase(),
    })
    if (error) throw new Error(error.message)
    await fetch()
  }

  const updateStock = async (id: string, values: Partial<Pick<Stock, 'name' | 'sector_id' | 'notes' | 'is_active'>>) => {
    const { error } = await supabase.from('stocks').update(values).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const deleteStock = async (id: string) => {
    const { error } = await supabase.from('stocks').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return { stocks, loading, error, createStock, updateStock, deleteStock, refetch: fetch }
}
