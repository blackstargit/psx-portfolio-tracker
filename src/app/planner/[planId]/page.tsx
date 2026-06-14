'use client'

import { use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { usePlan } from '@/hooks/use-plans'
import { formatCurrency, formatMonth, formatPrice } from '@/lib/formatters'

export default function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params)
  const { plan, allocations, loading, finalizePlan } = usePlan(planId)

  const handleFinalize = async () => {
    if (!confirm('Finalize this plan? This cannot be undone.')) return
    try {
      await finalizePlan()
      toast.success('Plan finalized')
    } catch {
      toast.error('Failed to finalize plan')
    }
  }

  // Group allocations by sector
  const bySector = allocations.reduce<Record<string, typeof allocations>>((acc, a) => {
    const sectorName = a.sector?.name ?? 'Unknown'
    if (!acc[sectorName]) acc[sectorName] = []
    acc[sectorName].push(a)
    return acc
  }, {})

  const totalShares = allocations.reduce((sum, a) => sum + a.shares_to_buy, 0)
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0)

  return (
    <div className="flex flex-col flex-1">
      <Header title={plan ? `Plan: ${formatMonth(plan.month)}` : 'Plan Detail'} />

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/planner" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Planner
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : !plan ? (
          <p className="text-muted-foreground">Plan not found.</p>
        ) : (
          <>
            {/* Plan header */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-6 items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{formatMonth(plan.month)}</h2>
                      <Badge variant={plan.status === 'finalized' ? 'default' : 'secondary'}>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">Budget: {formatCurrency(plan.budget)}</p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Stocks Selected</p>
                      <p className="font-semibold text-base">{allocations.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Shares</p>
                      <p className="font-semibold text-base">{totalShares}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Allocated</p>
                      <p className="font-semibold text-base">{formatCurrency(totalAllocated)}</p>
                    </div>
                  </div>
                  {plan.status === 'draft' && (
                    <Button onClick={handleFinalize} size="sm">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Finalize
                    </Button>
                  )}
                </div>
                {plan.notes && (
                  <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{plan.notes}</p>
                )}
              </CardContent>
            </Card>

            {/* Allocations by sector */}
            {Object.entries(bySector).map(([sectorName, items]) => {
              const sectorTotal = items.reduce((sum, a) => sum + a.allocated_amount, 0)
              return (
                <Card key={sectorName}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{sectorName}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {items[0]?.sector_pct_snapshot}% — {formatCurrency(sectorTotal)}
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
                          {items.map((a) => (
                            <tr key={a.id} className="border-b last:border-0">
                              <td className="py-2">
                                <span className="font-mono font-semibold text-primary">
                                  {a.stock?.symbol.replace('.KA', '')}
                                </span>
                                <span className="ml-2 text-xs text-muted-foreground">{a.stock?.name}</span>
                              </td>
                              <td className="py-2 text-right">{a.stock_pct_in_sector}%</td>
                              <td className="py-2 text-right font-mono">{formatCurrency(a.allocated_amount)}</td>
                              <td className="py-2 text-right font-mono">
                                {a.price_at_plan ? formatPrice(a.price_at_plan) : '—'}
                              </td>
                              <td className="py-2 text-right font-semibold">{a.shares_to_buy}</td>
                              <td className="py-2 text-right font-mono text-red-600">
                                {a.stop_loss ? formatPrice(a.stop_loss) : '—'}
                              </td>
                              <td className="py-2 text-right font-mono text-muted-foreground">
                                {a.remaining_cash != null ? formatCurrency(a.remaining_cash) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {allocations.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No stock allocations in this plan.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
