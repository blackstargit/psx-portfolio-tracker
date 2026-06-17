'use client'

import { use, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { HoldingsTable } from '@/components/portfolio/holdings-table'
import { AddHoldingDialog } from '@/components/portfolio/add-holding-dialog'
import { PnlBadge } from '@/components/portfolio/pnl-badge'
import { PriceHistoryChart } from '@/components/charts/price-history-chart'
import type { PriceRange } from '@/components/charts/price-history-chart'
import { useHoldings } from '@/hooks/use-holdings'
import { useStocks } from '@/hooks/use-stocks'
import { usePrices } from '@/hooks/use-prices'
import { useDividends } from '@/hooks/use-dividends'
import { useHistoricalPrices } from '@/hooks/use-historical-prices'
import { calcPnLPct, calcStopLoss } from '@/lib/calculations'
import { formatCurrency, formatDate, formatPrice } from '@/lib/formatters'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RANGE_DAYS: Record<PriceRange, number | null> = {
  '1D': 1, '1W': 7, '1M': 30, '6M': 180, '1Y': 365, 'All': null,
}

function sliceBars<T extends { date: string }>(bars: T[], range: PriceRange): T[] {
  const days = RANGE_DAYS[range]
  if (days === null) return bars
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return bars.filter((b) => b.date >= cutoffStr)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StockDetailPage({ params }: { params: Promise<{ stockId: string }> }) {
  const { stockId } = use(params)

  const { holdings, loading, deleteHolding, addHolding, updateHolding, markSold } = useHoldings(stockId)
  const { stocks } = useStocks()
  const { dividends, loading: dividendsLoading } = useDividends(stockId)
  const { prices, fetchPrices, loading: pricesLoading, lastRefreshed, canRefresh, refreshAll } = usePrices()
  const { bars, loading: histLoading, refresh: histRefresh } = useHistoricalPrices(
    stocks.find((s) => s.id === stockId)?.symbol
  )

  const stock = stocks.find((s) => s.id === stockId)
  const symbol = stock?.symbol ?? ''
  const priceData = prices[symbol]
  const currentPrice = priceData?.price

  // Range is shared between the chart controls and the period-stats cards below it
  const [range, setRange] = useState<PriceRange>('1M')

  useEffect(() => {
    if (symbol) fetchPrices([symbol])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  const totalQty = holdings.reduce((sum, h) => sum + h.quantity, 0)
  const totalCost = holdings.reduce((sum, h) => sum + h.buy_price * h.quantity, 0)
  const avgBuyPrice = totalQty > 0 ? totalCost / totalQty : 0
  const pnlPct = currentPrice != null && avgBuyPrice > 0 ? calcPnLPct(avgBuyPrice, currentPrice) : null
  const stopLoss = currentPrice != null ? calcStopLoss(currentPrice) : null

  const stockForDialog = stocks.filter((s) => s.id === stockId)

  // ── Combined refresh ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!canRefresh) return
    await refreshAll()
    histRefresh()
  }

  // ── OHLCV-derived stats ───────────────────────────────────────────────────
  const filteredBars = useMemo(() => sliceBars(bars, range), [bars, range])

  const rangeStats = useMemo(() => {
    if (filteredBars.length === 0) return null
    const open = filteredBars[0].open
    const close = filteredBars[filteredBars.length - 1].close
    const high = filteredBars.reduce((m, b) => Math.max(m, b.high), -Infinity)
    const low = filteredBars.reduce((m, b) => Math.min(m, b.low), Infinity)
    const changePct = ((close - open) / open) * 100
    return { open, high, low, close, changePct }
  }, [filteredBars])

  const longTermStats = useMemo(() => {
    if (bars.length === 0) return null
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const cutoff52w = oneYearAgo.toISOString().slice(0, 10)
    const bars52w = bars.filter((b) => b.date >= cutoff52w)
    return {
      high52w: bars52w.length > 0 ? bars52w.reduce((m, b) => Math.max(m, b.high), -Infinity) : null,
      low52w: bars52w.length > 0 ? bars52w.reduce((m, b) => Math.min(m, b.low), Infinity) : null,
      allTimeHigh: bars.reduce((m, b) => Math.max(m, b.high), -Infinity),
      allTimeLow: bars.reduce((m, b) => Math.min(m, b.low), Infinity),
    }
  }, [bars])

  // Most recent 30 trading days, newest first
  const recentBars = useMemo(() => [...bars].reverse().slice(0, 30), [bars])

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={stock ? `${symbol.replace('.KA', '')} — ${stock.name}` : 'Stock Detail'}
        onRefresh={handleRefresh}
        isRefreshing={pricesLoading || histLoading}
        canRefresh={canRefresh}
        lastRefreshed={lastRefreshed}
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/portfolio" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Portfolio
          </Link>
          {stock?.sector && (
            <Badge variant="outline">{stock.sector.name}</Badge>
          )}
        </div>

        {/* Stock summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Current Price</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold font-mono">{currentPrice != null ? formatPrice(currentPrice) : '—'}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Stop Loss</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold font-mono text-red-600">{stopLoss != null ? formatPrice(stopLoss) : '—'}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Avg Buy Price</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold font-mono">{formatPrice(avgBuyPrice)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">P&L %</CardTitle></CardHeader>
            <CardContent><PnlBadge pct={pnlPct} className="text-base" /></CardContent>
          </Card>
        </div>

        {/* ── Price History Chart ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Price History</h2>

          <PriceHistoryChart
            bars={bars}
            holdings={holdings.map((h) => ({
              id: h.id,
              buy_price: h.buy_price,
              buy_date: h.buy_date,
              quantity: h.quantity,
            }))}
            loading={histLoading}
            symbol={symbol}
            externalRange={range}
            onRangeChange={setRange}
          />

          {/* Period stats cards */}
          {rangeStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: 'Open', value: formatPrice(rangeStats.open) },
                { label: 'High', value: formatPrice(rangeStats.high) },
                { label: 'Low', value: formatPrice(rangeStats.low) },
                { label: 'Close', value: formatPrice(rangeStats.close) },
                {
                  label: `${range} Change`,
                  value: `${rangeStats.changePct >= 0 ? '+' : ''}${rangeStats.changePct.toFixed(2)}%`,
                  className: rangeStats.changePct >= 0 ? 'text-green-500' : 'text-red-500',
                },
                ...(longTermStats
                  ? [
                      { label: '52W High', value: longTermStats.high52w != null ? formatPrice(longTermStats.high52w) : '—' },
                      { label: '52W Low', value: longTermStats.low52w != null ? formatPrice(longTermStats.low52w) : '—' },
                      { label: 'All-Time High', value: formatPrice(longTermStats.allTimeHigh) },
                      { label: 'All-Time Low', value: formatPrice(longTermStats.allTimeLow) },
                    ]
                  : []),
              ].map(({ label, value, className: cls }) => (
                <Card key={label}>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <p className={`text-sm font-bold font-mono ${cls ?? ''}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recent OHLCV table */}
          {recentBars.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Recent Sessions (last {recentBars.length} days)</h3>
              <div className="rounded-md border overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-right px-3 py-2">Open</th>
                      <th className="text-right px-3 py-2">High</th>
                      <th className="text-right px-3 py-2">Low</th>
                      <th className="text-right px-3 py-2">Close</th>
                      <th className="text-right px-3 py-2">Volume</th>
                      <th className="text-right px-3 py-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBars.map((b, i) => {
                      const prev = recentBars[i + 1] // array is newest-first, so next index = prev day
                      const change = prev ? ((b.close - prev.close) / prev.close) * 100 : null
                      const isUp = change != null ? change >= 0 : b.close >= b.open
                      return (
                        <tr key={b.date} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-1.5 text-muted-foreground">{formatDate(b.date)}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{formatPrice(b.open)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-green-500">{formatPrice(b.high)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-red-500">{formatPrice(b.low)}</td>
                          <td className={`px-3 py-1.5 text-right font-mono font-semibold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                            {formatPrice(b.close)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                            {b.volume.toLocaleString()}
                          </td>
                          <td className={`px-3 py-1.5 text-right font-mono ${change == null ? 'text-muted-foreground' : change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {change == null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Holdings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Purchase Lots ({holdings.length})</h2>
            <AddHoldingDialog stocks={stockForDialog} onAdd={addHolding} defaultStockId={stockId} />
          </div>
          <HoldingsTable
            holdings={holdings}
            prices={prices}
            loading={loading}
            onDelete={deleteHolding}
            onEdit={updateHolding}
            onMarkSold={markSold}
            showStock={false}
          />
        </div>

        <Separator />

        {/* Dividends */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Dividend History ({dividends.length})</h2>
          {dividendsLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : dividends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dividends recorded. Go to the Dividends section to add them.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2">Ex-Date</th>
                    <th className="text-left px-4 py-2">Payment Date</th>
                    <th className="text-right px-4 py-2">Per Share</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-right px-4 py-2">Your Income</th>
                    <th className="text-left px-4 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {dividends.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{formatDate(d.ex_date)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{d.payment_date ? formatDate(d.payment_date) : '—'}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatCurrency(d.amount_per_share)}</td>
                      <td className="px-4 py-2"><Badge variant="secondary" className="capitalize">{d.dividend_type}</Badge></td>
                      <td className="px-4 py-2 text-right font-mono text-green-600">{formatCurrency(d.amount_per_share * totalQty)}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs uppercase">{d.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        {stock?.notes && (
          <>
            <Separator />
            <div>
              <h2 className="text-base font-semibold mb-2">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{stock.notes}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
