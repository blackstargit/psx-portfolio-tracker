'use client'

import Link from 'next/link'
import { Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PnlBadge } from './pnl-badge'
import { formatCurrency, formatDate, formatNumber, formatPrice } from '@/lib/formatters'
import { calcPnLPct, calcPnLAmount, calcCurrentValue } from '@/lib/calculations'
import type { Holding, PriceMap } from '@/types'

interface HoldingsTableProps {
  holdings: Holding[]
  prices: PriceMap
  loading: boolean
  onDelete: (id: string) => Promise<void>
  showStock?: boolean
}

export function HoldingsTable({
  holdings,
  prices,
  loading,
  onDelete,
  showStock = true,
}: HoldingsTableProps) {
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
        No holdings yet. Add your first purchase to get started.
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holding?')) return
    try {
      await onDelete(id)
      toast.success('Holding deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {showStock && <TableHead>Stock</TableHead>}
            {showStock && <TableHead>Sector</TableHead>}
            <TableHead>Buy Date</TableHead>
            <TableHead className="text-right">Buy Price</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="text-right">P&L %</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => {
            const symbol = holding.stock?.symbol ?? ''
            const priceData = prices[symbol]
            const currentPrice = priceData?.price
            const pnlPct = currentPrice != null
              ? calcPnLPct(holding.buy_price, currentPrice)
              : null
            const pnlAmount = currentPrice != null
              ? calcPnLAmount(holding.buy_price, currentPrice, holding.quantity)
              : null
            const currentValue = currentPrice != null
              ? calcCurrentValue(currentPrice, holding.quantity)
              : null
            const cost = holding.buy_price * holding.quantity

            return (
              <TableRow key={holding.id}>
                {showStock && (
                  <TableCell>
                    <Link
                      href={`/portfolio/${holding.stock_id}`}
                      className="font-mono font-semibold hover:underline text-primary"
                    >
                      {symbol.replace('.KA', '')}
                    </Link>
                    {priceData?.stale && (
                      <span className="ml-1 text-xs text-yellow-600">(stale)</span>
                    )}
                  </TableCell>
                )}
                {showStock && (
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {holding.stock?.sector?.name ?? '—'}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-sm">{formatDate(holding.buy_date)}</TableCell>
                <TableCell className="text-right font-mono">{formatPrice(holding.buy_price)}</TableCell>
                <TableCell className="text-right">{formatNumber(holding.quantity)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(cost)}</TableCell>
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
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(holding.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
