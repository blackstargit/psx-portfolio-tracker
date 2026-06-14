'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PnlBadge } from './pnl-badge'
import { formatCurrency, formatDate, formatNumber, formatPrice } from '@/lib/formatters'
import { calcPnLPct, calcPnLAmount, calcCurrentValue } from '@/lib/calculations'
import type { ConsolidatedHolding, PriceMap } from '@/types'

interface ConsolidatedViewProps {
  holdings: ConsolidatedHolding[]
  prices: PriceMap
  loading: boolean
}

export function ConsolidatedView({ holdings, prices, loading }: ConsolidatedViewProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No holdings yet.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stock</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead className="text-right">Lots</TableHead>
            <TableHead className="text-right">Avg Buy Price</TableHead>
            <TableHead className="text-right">Total Qty</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">Current Value</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="text-right">P&L %</TableHead>
            <TableHead className="text-center">First / Last Buy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const symbol = h.stock?.symbol ?? ''
            const priceData = prices[symbol]
            const currentPrice = priceData?.price
            const pnlPct = currentPrice != null ? calcPnLPct(h.avg_buy_price, currentPrice) : null
            const pnlAmount = currentPrice != null ? calcPnLAmount(h.avg_buy_price, currentPrice, h.total_quantity) : null
            const currentValue = currentPrice != null ? calcCurrentValue(currentPrice, h.total_quantity) : null

            return (
              <TableRow key={h.stock_id}>
                <TableCell>
                  <Link
                    href={`/portfolio/${h.stock_id}`}
                    className="font-mono font-semibold hover:underline text-primary"
                  >
                    {symbol.replace('.KA', '')}
                  </Link>
                  {priceData?.stale && (
                    <span className="ml-1 text-xs text-yellow-600">(stale)</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {h.stock?.sector?.name ?? '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {h.lot_count}
                </TableCell>
                <TableCell className="text-right font-mono">{formatPrice(h.avg_buy_price)}</TableCell>
                <TableCell className="text-right">{formatNumber(h.total_quantity)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(h.total_cost)}</TableCell>
                <TableCell className="text-right font-mono">
                  {currentPrice != null ? formatPrice(currentPrice) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {currentValue != null ? formatCurrency(currentValue) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {pnlAmount != null ? (
                    <span className={pnlAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(pnlAmount)}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <PnlBadge pct={pnlPct} />
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {formatDate(h.first_buy_date)} / {formatDate(h.last_buy_date)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
