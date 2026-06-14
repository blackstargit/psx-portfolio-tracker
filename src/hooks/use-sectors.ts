'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Sector } from '@/types'

export function useSectors() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setSectors(data as Sector[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const createSector = async (values: Omit<Sector, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('sectors').insert(values)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const updateSector = async (id: string, values: Partial<Omit<Sector, 'id' | 'created_at'>>) => {
    const { error } = await supabase.from('sectors').update(values).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const deleteSector = async (id: string) => {
    const { error } = await supabase.from('sectors').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const totalAllocation = sectors.reduce((sum, s) => sum + (s.allocation_pct ?? 0), 0)

  return { sectors, loading, error, createSector, updateSector, deleteSector, totalAllocation, refetch: fetch }
}
