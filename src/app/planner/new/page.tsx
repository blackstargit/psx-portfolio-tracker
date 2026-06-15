'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Header } from '@/components/layout/header'
import { useSectors } from '@/hooks/use-sectors'
import { useStocks } from '@/hooks/use-stocks'
import { usePlans } from '@/hooks/use-plans'
import { usePrices } from '@/hooks/use-prices'
import {
  calcSectorAmount,
  calcStockAmount,
  calcSharesToBuy,
  calcRemainingCash,
  calcStopLoss,
} from '@/lib/calculations'
import { formatCurrency, formatPrice, formatMonth, monthToDate } from '@/lib/formatters'
import type { Sector, Stock } from '@/types'

interface StockSelection {
  stock: Stock
  pct: number // % of this sector's allocation
}

interface SectorPlan {
  sector: Sector
  selections: StockSelection[]
}

export default function NewPlanPage() {
  const router = useRouter()
  const { sectors, totalAllocation } = useSectors()
  const { stocks } = useStocks()
  const { createPlan } = usePlans()
  const { prices, fetchPrices, loading: pricesLoading } = usePrices()

  const today = new Date()
  const [month, setMonth] = useState(monthToDate(today.getFullYear(), today.getMonth() + 1))
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<'setup' | 'allocate' | 'review'>('setup')
  const [sectorPlans, setSectorPlans] = useState<SectorPlan[]>([])
  const [saving, setSaving] = useState(false)

  const budgetNum = parseFloat(budget) || 0
  const allSymbols = stocks.map((s) => s.symbol)

  const goToAllocate = () => {
    if (!month || !budget || budgetNum <= 0) {
      toast.error('Enter a valid month and budget')
      return
    }
    if (Math.abs(totalAllocation - 100) > 0.5) {
      toast.error(`Sector allocations must total 100% (currently ${totalAllocation.toFixed(1)}%)`)
      return
    }
    // Fetch latest prices
    if (allSymbols.length > 0) fetchPrices(allSymbols)
    setSectorPlans(sectors.map((s) => ({ sector: s, selections: [] })))
    setStep('allocate')
  }

  const addStock = (sectorId: string, stock: Stock) => {
    setSectorPlans((prev) =>
      prev.map((sp) =>
        sp.sector.id === sectorId
          ? {
              ...sp,
              selections: sp.selections.find((s) => s.stock.id === stock.id)
                ? sp.selections
                : [...sp.selections, { stock, pct: 0 }],
            }
          : sp
      )
    )
  }

  const removeStock = (sectorId: string, stockId: string) => {
    setSectorPlans((prev) =>
      prev.map((sp) =>
        sp.sector.id === sectorId
          ? { ...sp, selections: sp.selections.filter((s) => s.stock.id !== stockId) }
          : sp
      )
    )
  }

  const updatePct = (sectorId: string, stockId: string, pct: number) => {
    setSectorPlans((prev) =>
      prev.map((sp) =>
        sp.sector.id === sectorId
          ? {
              ...sp,
              selections: sp.selections.map((s) =>
                s.stock.id === stockId ? { ...s, pct } : s
              ),
            }
          : sp
      )
    )
  }

  const getSectorStocks = (sectorId: string) =>
    stocks.filter((s) => s.sector_id === sectorId)

  const getSectorTotal = (sp: SectorPlan) =>
    sp.selections.reduce((sum, s) => sum + (s.pct || 0), 0)

  const isAllocationValid = () =>
    sectorPlans
      .filter((sp) => sp.selections.length > 0)
      .every((sp) => Math.abs(getSectorTotal(sp) - 100) < 0.5)

  const handleSave = async (status: 'draft' | 'finalized') => {
    if (!isAllocationValid()) {
      toast.error('Within-sector percentages must total 100% for each active sector')
      return
    }

    setSaving(true)
    try {
      const plan = await createPlan({ month, budget: budgetNum, notes })

      // Build allocations
      const allocations: Database['public']['Tables']['plan_allocations']['Insert'][] = []
      for (const sp of sectorPlans) {
        if (sp.selections.length === 0) continue
        const sectorAmount = calcSectorAmount(budgetNum, sp.sector.allocation_pct)
        for (const sel of sp.selections) {
          const allocatedAmount = calcStockAmount(sectorAmount, sel.pct)
          const priceAtPlan = prices[sel.stock.symbol]?.price ?? null
          const sharesToBuy = priceAtPlan ? calcSharesToBuy(allocatedAmount, priceAtPlan) : 0
          const stopLoss = priceAtPlan ? calcStopLoss(priceAtPlan) : null
          const remainingCash = priceAtPlan
            ? calcRemainingCash(allocatedAmount, sharesToBuy, priceAtPlan)
            : null

          allocations.push({
            plan_id: plan.id,
            stock_id: sel.stock.id,
            sector_id: sp.sector.id,
            stock_pct_in_sector: sel.pct,
            sector_pct_snapshot: sp.sector.allocation_pct,
            allocated_amount: allocatedAmount,
            price_at_plan: priceAtPlan,
            shares_to_buy: sharesToBuy,
            stop_loss: stopLoss,
            remaining_cash: remainingCash,
          })
        }
      }

      // Save allocations
      if (allocations.length > 0) {
        await supabase.from('plan_allocations').insert(allocations)
      }

      if (status === 'finalized') {
        await supabase.from('monthly_plans').update({ status: 'finalized' as const }).eq('id', plan.id)
      }

      toast.success('Plan saved!')
      router.push(`/planner/${plan.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'setup') {
    return (
      <div className="flex flex-col flex-1">
        <Header title="New Monthly Plan" />
        <div className="p-6 max-w-lg space-y-6">
          <Link href="/planner" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>

          <Card>
            <CardHeader><CardTitle>Plan Setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="plan-month">Month</Label>
                <Input
                  id="plan-month"
                  type="month"
                  value={month.substring(0, 7)}
                  onChange={(e) => setMonth(e.target.value + '-01')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-budget">Monthly Budget (PKR)</Label>
                <Input
                  id="plan-budget"
                  type="number"
                  min="1"
                  step="1000"
                  placeholder="100000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                {budgetNum > 0 && (
                  <p className="text-xs text-muted-foreground">{formatCurrency(budgetNum)}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-notes">Notes (optional)</Label>
                <Input id="plan-notes" placeholder="Any notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {Math.abs(totalAllocation - 100) > 0.5 && (
                <Alert>
                  <AlertDescription>
                    Sector allocations total {totalAllocation.toFixed(1)}%, not 100%. Go to{' '}
                    <Link href="/sectors" className="underline">Sectors</Link> to fix this first.
                  </AlertDescription>
                </Alert>
              )}
              <Button onClick={goToAllocate} className="w-full">
                Next: Allocate Stocks <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'review') {
    const activeSectors = sectorPlans.filter((sp) => sp.selections.length > 0)
    const totalShares = activeSectors.flatMap((sp) => {
      const sectorAmount = calcSectorAmount(budgetNum, sp.sector.allocation_pct)
      return sp.selections.map((sel) => {
        const price = prices[sel.stock.symbol]?.price
        return price ? calcSharesToBuy(calcStockAmount(sectorAmount, sel.pct), price) : 0
      })
    }).reduce((sum, n) => sum + n, 0)
    const totalAllocated = activeSectors.flatMap((sp) => {
      const sectorAmount = calcSectorAmount(budgetNum, sp.sector.allocation_pct)
      return sp.selections.map((sel) => calcStockAmount(sectorAmount, sel.pct))
    }).reduce((sum, n) => sum + n, 0)

    return (
      <div className="flex flex-col flex-1">
        <Header title="New Monthly Plan — Review" />
        <div className="p-6 space-y-6">
          <Button variant="ghost" size="sm" onClick={() => setStep('allocate')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Allocate
          </Button>

          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Month</p>
                  <p className="font-semibold">{formatMonth(month)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="font-semibold">{formatCurrency(budgetNum)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Allocated</p>
                  <p className="font-semibold">{formatCurrency(totalAllocated)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Shares</p>
                  <p className="font-semibold">{totalShares}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stocks</p>
                  <p className="font-semibold">{activeSectors.reduce((sum, sp) => sum + sp.selections.length, 0)}</p>
                </div>
              </div>
              {notes && <p className="mt-2 text-sm text-muted-foreground border-t pt-2">{notes}</p>}
            </CardContent>
          </Card>

          {activeSectors.map((sp) => {
            const sectorAmount = calcSectorAmount(budgetNum, sp.sector.allocation_pct)
            return (
              <Card key={sp.sector.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{sp.sector.name}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {sp.sector.allocation_pct}% — {formatCurrency(sectorAmount)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left pb-2">Stock</th>
                          <th className="text-right pb-2">% of Sector</th>
                          <th className="text-right pb-2">Amount</th>
                          <th className="text-right pb-2">Price</th>
                          <th className="text-right pb-2">Shares</th>
                          <th className="text-right pb-2">Stop Loss</th>
                          <th className="text-right pb-2">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sp.selections.map((sel) => {
                          const allocAmt = calcStockAmount(sectorAmount, sel.pct)
                          const price = prices[sel.stock.symbol]?.price
                          const shares = price ? calcSharesToBuy(allocAmt, price) : 0
                          const stopLoss = price ? calcStopLoss(price) : null
                          const remaining = price ? calcRemainingCash(allocAmt, shares, price) : null
                          return (
                            <tr key={sel.stock.id} className="border-b last:border-0">
                              <td className="py-2">
                                <span className="font-mono font-semibold text-primary">
                                  {sel.stock.symbol.replace('.KA', '')}
                                </span>
                                <span className="ml-2 text-xs text-muted-foreground">{sel.stock.name}</span>
                              </td>
                              <td className="py-2 text-right">{sel.pct}%</td>
                              <td className="py-2 text-right font-mono">{formatCurrency(allocAmt)}</td>
                              <td className="py-2 text-right font-mono">
                                {price ? formatPrice(price) : <span className="text-yellow-600">—</span>}
                              </td>
                              <td className="py-2 text-right font-semibold">{shares}</td>
                              <td className="py-2 text-right font-mono text-red-600">
                                {stopLoss ? formatPrice(stopLoss) : '—'}
                              </td>
                              <td className="py-2 text-right font-mono text-muted-foreground">
                                {remaining != null ? formatCurrency(remaining) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Separator />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save as Draft
            </Button>
            <Button onClick={() => handleSave('finalized')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Finalize Plan
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="New Monthly Plan — Allocate" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('setup')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="text-sm text-muted-foreground">Budget: {formatCurrency(budgetNum)}</span>
          </div>
          {pricesLoading && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Fetching prices...</span>}
        </div>

        <div className="space-y-4">
          {sectorPlans.map((sp) => {
            const sectorAmount = calcSectorAmount(budgetNum, sp.sector.allocation_pct)
            const availableStocks = getSectorStocks(sp.sector.id)
            const sectorTotal = getSectorTotal(sp)
            const isValid = sp.selections.length === 0 || Math.abs(sectorTotal - 100) < 0.5

            return (
              <Card key={sp.sector.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {sp.sector.name}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {sp.sector.allocation_pct}% = {formatCurrency(sectorAmount)}
                      </span>
                    </CardTitle>
                    {!isValid && (
                      <Badge variant="destructive" className="text-xs">
                        {sectorTotal.toFixed(0)}% / 100%
                      </Badge>
                    )}
                    {isValid && sp.selections.length > 0 && (
                      <Badge className="text-xs bg-green-600">100% ✓</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Selected stocks */}
                  {sp.selections.map((sel) => {
                    const price = prices[sel.stock.symbol]?.price
                    const allocAmt = calcStockAmount(sectorAmount, sel.pct)
                    const shares = price ? calcSharesToBuy(allocAmt, price) : 0
                    const stopLoss = price ? calcStopLoss(price) : null
                    const remaining = price ? calcRemainingCash(allocAmt, shares, price) : null

                    return (
                      <div key={sel.stock.id} className="p-3 border rounded-md space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-sm">
                            {sel.stock.symbol.replace('.KA', '')}
                          </span>
                          <span className="text-xs text-muted-foreground flex-1">{sel.stock.name}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-20 h-7 text-sm"
                              placeholder="%"
                              value={sel.pct || ''}
                              onChange={(e) => updatePct(sp.sector.id, sel.stock.id, parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive"
                              onClick={() => removeStock(sp.sector.id, sel.stock.id)}
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                        {sel.pct > 0 && (
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pl-1">
                            <span>Amount: {formatCurrency(allocAmt)}</span>
                            {price ? (
                              <>
                                <span>Price: {formatPrice(price)}</span>
                                <span className="font-semibold text-foreground">Shares: {shares}</span>
                                <span className="text-red-600">Stop Loss: {formatPrice(stopLoss)}</span>
                                <span>Remaining: {formatCurrency(remaining)}</span>
                              </>
                            ) : (
                              <span className="text-yellow-600">Price unavailable</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add stock dropdown */}
                  {availableStocks.length > 0 && (
                    <select
                      className="w-full text-sm border rounded-md px-3 py-1.5 bg-background text-foreground"
                      value=""
                      onChange={(e) => {
                        const stock = availableStocks.find((s) => s.id === e.target.value)
                        if (stock) addStock(sp.sector.id, stock)
                      }}
                    >
                      <option value="">+ Add stock to this sector...</option>
                      {availableStocks
                        .filter((s) => !sp.selections.find((sel) => sel.stock.id === s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.symbol.replace('.KA', '')} — {s.name}
                          </option>
                        ))}
                    </select>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button
            onClick={() => setStep('review')}
            disabled={!isAllocationValid()}
          >
            Next: Review <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
