'use client'

import { use, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { HoldingsTable } from '@/components/portfolio/holdings-table'
import { AddHoldingDialog } from '@/components/portfolio/add-holding-dialog'
import { PnlBadge } from '@/components/portfolio/pnl-badge'
import { useHoldings } from '@/hooks/use-holdings'
import { useStocks } from '@/hooks/use-stocks'
import { usePrices } from '@/hooks/use-prices'
import { useDividends } from '@/hooks/use-dividends'
import { calcPnLPct, calcCurrentValue, calcStopLoss } from '@/lib/calculations'
import { formatCurrency, formatDate, formatPrice } from '@/lib/formatters'

export default function StockDetailPage({ params }: { params: Promise<{ stockId: string }> }) {
  const { stockId } = use(params)
  const { holdings, loading, deleteHolding, addHolding, updateHolding, markSold } = useHoldings(stockId)
  const { stocks } = useStocks()
  const { dividends, loading: dividendsLoading } = useDividends(stockId)
  const { prices, fetchPrices } = usePrices()

  const stock = stocks.find((s) => s.id === stockId)
  const symbol = stock?.symbol ?? ''
  const priceData = prices[symbol]
  const currentPrice = priceData?.price

  useEffect(() => {
    if (symbol) fetchPrices([symbol])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  const totalQty = holdings.reduce((sum, h) => sum + h.quantity, 0)
  const totalCost = holdings.reduce((sum, h) => sum + h.buy_price * h.quantity, 0)
  const avgBuyPrice = totalQty > 0 ? totalCost / totalQty : 0
  const currentValue = currentPrice != null ? calcCurrentValue(currentPrice, totalQty) : null
  const pnlPct = currentPrice != null && avgBuyPrice > 0 ? calcPnLPct(avgBuyPrice, currentPrice) : null
  const stopLoss = currentPrice != null ? calcStopLoss(currentPrice) : null

  const stockForDialog = stocks.filter((s) => s.id === stockId)

  return (
    <div className="flex flex-col flex-1">
      <Header title={stock ? `${symbol.replace('.KA', '')} — ${stock.name}` : 'Stock Detail'} />

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
