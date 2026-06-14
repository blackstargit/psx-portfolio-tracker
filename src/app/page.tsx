'use client'

import { useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { PortfolioPieChart } from '@/components/charts/portfolio-pie-chart'
import { PnlBarChart } from '@/components/charts/pnl-bar-chart'
import { useHoldings } from '@/hooks/use-holdings'
import { useSectors } from '@/hooks/use-sectors'
import { usePrices } from '@/hooks/use-prices'
import { calcPortfolioTotals, calcPnLPct } from '@/lib/calculations'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { holdings, consolidated, loading: holdingsLoading } = useHoldings()
  const { sectors } = useSectors()
  const { prices, loading: pricesLoading, lastRefreshed, canRefresh, refreshAll, fetchPrices } = usePrices()

  const allSymbols = [...new Set(holdings.map((h) => h.stock?.symbol).filter(Boolean) as string[])]

  useEffect(() => {
    if (allSymbols.length > 0) {
      fetchPrices(allSymbols)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsLoading])

  const holdingsWithPrices = holdings.map((h) => ({
    ...h,
    current_price: prices[h.stock?.symbol ?? '']?.price,
  }))

  const totals = calcPortfolioTotals(holdingsWithPrices)

  const sectorValues = sectors.map((sector) => {
    const sectorConsolidated = consolidated.filter((c) => c.stock?.sector_id === sector.id)
    const value = sectorConsolidated.reduce((sum, c) => {
      const price = prices[c.stock?.symbol ?? '']?.price ?? c.avg_buy_price
      return sum + price * c.total_quantity
    }, 0)
    return { sector, value }
  })

  const pnlData = consolidated
    .map((c) => {
      const symbol = c.stock?.symbol ?? ''
      const currentPrice = prices[symbol]?.price
      if (!currentPrice) return null
      return { symbol, pnlPct: calcPnLPct(c.avg_buy_price, currentPrice) }
    })
    .filter(Boolean) as Array<{ symbol: string; pnlPct: number }>

  const isLoading = holdingsLoading || pricesLoading

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        onRefresh={refreshAll}
        isRefreshing={pricesLoading}
        canRefresh={canRefresh}
        lastRefreshed={lastRefreshed}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard title="Total Invested" value={formatCurrency(totals.totalCost)} icon={<DollarSign className="h-4 w-4" />} loading={isLoading} />
          <SummaryCard title="Current Value" value={formatCurrency(totals.currentValue)} icon={<BarChart2 className="h-4 w-4" />} loading={isLoading} />
          <SummaryCard
            title="P&L Amount"
            value={formatCurrency(totals.pnlAmount)}
            icon={totals.pnlAmount >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            valueClass={totals.pnlAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}
            loading={isLoading}
          />
          <SummaryCard
            title="P&L %"
            value={formatPercent(totals.pnlPct)}
            icon={totals.pnlPct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            valueClass={totals.pnlPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Portfolio by Sector</CardTitle>
            </CardHeader>
            <CardContent>
              <PortfolioPieChart data={sectorValues} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">P&L by Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <PnlBarChart data={pnlData} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Active Holdings</span>
                <span className="ml-2 font-semibold">{holdings.length} lots</span>
              </div>
              <div>
                <span className="text-muted-foreground">Unique Stocks</span>
                <span className="ml-2 font-semibold">{consolidated.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sectors</span>
                <span className="ml-2 font-semibold">{sectors.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  loading,
  valueClass,
}: {
  title: string
  value: string
  icon: React.ReactNode
  loading?: boolean
  valueClass?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-3/4" />
        ) : (
          <p className={cn('text-xl font-bold tabular-nums', valueClass)}>{value}</p>
        )}
      </CardContent>
    </Card>
  )
}
