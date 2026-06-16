'use client'

import { useMemo } from 'react'
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
import { SortButton } from '@/components/ui/sort-button'
import { formatCurrency, formatDate, formatNumber, formatPrice } from '@/lib/formatters'
import { calcPnLPct, calcPnLAmount, calcCurrentValue } from '@/lib/calculations'
import { useSort, sortRows } from '@/hooks/use-sort'
import type { ConsolidatedHolding, PriceMap } from '@/types'

interface ConsolidatedViewProps {
  holdings: ConsolidatedHolding[]
  prices: PriceMap
  loading: boolean
}

export function ConsolidatedView({ holdings, prices, loading }: ConsolidatedViewProps) {
  const { sort, toggle } = useSort()

  const sorted = useMemo(
    () =>
      sortRows(holdings, sort, (h, key) => {
        const symbol = h.stock?.symbol ?? ''
        const cp = prices[symbol]?.price ?? null
        switch (key) {
          case 'stock':
            return symbol
          case 'sector':
            return h.stock?.sector?.name ?? ''
          case 'lots':
            return h.lot_count
          case 'avgBuyPrice':
            return h.avg_buy_price
          case 'totalQty':
            return h.total_quantity
          case 'totalCost':
            return h.total_cost
          case 'currentPrice':
            return cp
          case 'currentValue':
            return cp != null ? calcCurrentValue(cp, h.total_quantity) : null
          case 'pnl':
            return cp != null ? calcPnLAmount(h.avg_buy_price, cp, h.total_quantity) : null
          case 'pnlPct':
            return cp != null ? calcPnLPct(h.avg_buy_price, cp) : null
          case 'firstBuy':
            return new Date(h.first_buy_date).getTime()
          default:
            return null
        }
      }),
    [holdings, prices, sort]
  )

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
            <TableHead>
              <SortButton label="Stock" active={sort.key === 'stock'} dir={sort.dir} onClick={() => toggle('stock')} />
            </TableHead>
            <TableHead>
              <SortButton label="Sector" active={sort.key === 'sector'} dir={sort.dir} onClick={() => toggle('sector')} />
            </TableHead>
            <TableHead className="text-right">
              <SortButton label="Lots" align="right" active={sort.key === 'lots'} dir={sort.dir} onClick={() => toggle('lots')} />
            </TableHead>
            <TableHead className="text-right">
              <SortButton label="Avg Buy Price" align="right" active={sort.key === 'avgBuyPrice'} dir={sort.dir} onClick={() => toggle('avgBuyPrice')} />
            </TableHead>
            <TableHead className="text-right">
              <SortButton label="Total Qty" align="right" active={sort.key === 'totalQty'} dir={sort.dir} onClick={() => toggle('totalQty')} />
            </TableHead>
            <TableHead className="text-right">
              <SortButton label="Total Cost" align="right" active={sort.key === 'totalCost'} dir={sort.dir} onClick={() => toggle('totalCost')} />
            </TableHead>
            <TableHead className="text-right">
              <SortButton label="Current Price" align="right" active={sort.key === 'currentPrice'} dir={sort.dir} onClick={() => toggle('currentPrice')} />
            </TableHead>
            <TableHead className="text-right">
              <SortButton label="Current Value" align="right" active={sort.key === 'currentValue'} dir={sort.dir} onClick={() => toggle('currentValue')} />
            </TableHead>
            <TableHead className="text-right">
              <SortButton label="P&L" align="right" active={sort.key === 'pnl'} dir={sort.dir} onClick={() => toggle('pnl')} />
            </TableHead>
            <TableHead className="text-right">
              <SortButton label="P&L %" align="right" active={sort.key === 'pnlPct'} dir={sort.dir} onClick={() => toggle('pnlPct')} />
            </TableHead>
            <TableHead className="text-center">
              <SortButton label="First / Last Buy" align="center" active={sort.key === 'firstBuy'} dir={sort.dir} onClick={() => toggle('firstBuy')} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((h) => {
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
