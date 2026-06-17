'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Holding, ConsolidatedHolding } from '@/types'

export function useHoldings(stockId?: string) {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [consolidated, setConsolidated] = useState<ConsolidatedHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('holdings')
      .select('*, stock:stocks(*, sector:sectors(*))')
      .eq('is_sold', false)
      .order('buy_date', { ascending: false })

    if (stockId) {
      query = query.eq('stock_id', stockId)
    }

    const { data, error } = await query
    if (error) {
      setError(error.message)
    } else {
      setHoldings(data as Holding[])
    }

    // Fetch consolidated view
    let consolidatedQuery = supabase
      .from('consolidated_holdings')
      .select('*, stock:stocks(*, sector:sectors(*))')

    if (stockId) {
      consolidatedQuery = consolidatedQuery.eq('stock_id', stockId)
    }

    const { data: consolidatedData } = await consolidatedQuery
    if (consolidatedData) {
      setConsolidated(consolidatedData as ConsolidatedHolding[])
    }

    setLoading(false)
  }, [stockId])

  useEffect(() => { fetch() }, [fetch])

  const addHolding = async (values: {
    stock_id: string
    buy_date: string
    buy_price: number
    quantity: number
    notes?: string
  }) => {
    const { error } = await supabase.from('holdings').insert(values)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const updateHolding = async (id: string, values: Partial<Pick<Holding, 'buy_date' | 'buy_price' | 'quantity' | 'notes'>>) => {
    const { error } = await supabase.from('holdings').update(values).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const deleteHolding = async (id: string) => {
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const markSold = async (holding: Holding, sellQuantity: number, sellDate: string, sellPrice: number) => {
    if (sellQuantity >= holding.quantity) {
      const { error } = await supabase
        .from('holdings')
        .update({ is_sold: true, sell_date: sellDate, sell_price: sellPrice })
        .eq('id', holding.id)
      if (error) throw new Error(error.message)
    } else {
      const { error: updateError } = await supabase
        .from('holdings')
        .update({ quantity: holding.quantity - sellQuantity })
        .eq('id', holding.id)
      if (updateError) throw new Error(updateError.message)
      const { error: insertError } = await supabase
        .from('holdings')
        .insert({
          stock_id: holding.stock_id,
          buy_date: holding.buy_date,
          buy_price: holding.buy_price,
          quantity: sellQuantity,
          is_sold: true,
          sell_date: sellDate,
          sell_price: sellPrice,
          notes: holding.notes ?? null,
        })
      if (insertError) throw new Error(insertError.message)
    }
    await fetch()
  }

  return { holdings, consolidated, loading, error, addHolding, updateHolding, deleteHolding, markSold, refetch: fetch }
}
