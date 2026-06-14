'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { MonthlyPlan, PlanAllocation } from '@/types'

export function usePlans() {
  const [plans, setPlans] = useState<MonthlyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('monthly_plans')
      .select('*')
      .order('month', { ascending: false })
    if (error) setError(error.message)
    else setPlans(data as MonthlyPlan[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const createPlan = async (values: { month: string; budget: number; notes?: string }) => {
    const { data, error } = await supabase.from('monthly_plans').insert(values).select().single()
    if (error) throw new Error(error.message)
    await fetch()
    return data as MonthlyPlan
  }

  const updatePlan = async (id: string, values: Partial<Pick<MonthlyPlan, 'budget' | 'status' | 'notes'>>) => {
    const { error } = await supabase.from('monthly_plans').update(values).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('monthly_plans').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return { plans, loading, error, createPlan, updatePlan, deletePlan, refetch: fetch }
}

export function usePlan(planId: string) {
  const [plan, setPlan] = useState<MonthlyPlan | null>(null)
  const [allocations, setAllocations] = useState<PlanAllocation[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [planRes, allocRes] = await Promise.all([
      supabase.from('monthly_plans').select('*').eq('id', planId).single(),
      supabase
        .from('plan_allocations')
        .select('*, stock:stocks(*, sector:sectors(*)), sector:sectors(*)')
        .eq('plan_id', planId),
    ])
    if (planRes.data) setPlan(planRes.data as MonthlyPlan)
    if (allocRes.data) setAllocations(allocRes.data as PlanAllocation[])
    setLoading(false)
  }, [planId])

  useEffect(() => { fetch() }, [fetch])

  const saveAllocations = async (items: Omit<PlanAllocation, 'id' | 'created_at' | 'stock' | 'sector'>[]) => {
    // Delete existing, then insert new
    await supabase.from('plan_allocations').delete().eq('plan_id', planId)
    if (items.length > 0) {
      const { error } = await supabase.from('plan_allocations').insert(items)
      if (error) throw new Error(error.message)
    }
    await fetch()
  }

  const finalizePlan = async () => {
    const { error } = await supabase
      .from('monthly_plans')
      .update({ status: 'finalized' })
      .eq('id', planId)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return { plan, allocations, loading, saveAllocations, finalizePlan, refetch: fetch }
}
