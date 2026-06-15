'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, Edit2, DollarSign } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PnlBadge } from './pnl-badge'
import { formatCurrency, formatDate, formatNumber, formatPrice } from '@/lib/formatters'
import { calcPnLPct, calcPnLAmount, calcCurrentValue } from '@/lib/calculations'
import type { Holding, PriceMap } from '@/types'

interface HoldingsTableProps {
  holdings: Holding[]
  prices: PriceMap
  loading: boolean
  onDelete: (id: string) => Promise<void>
  onEdit?: (id: string, values: { buy_date: string; buy_price: number; quantity: number; notes?: string }) => Promise<void>
  onMarkSold?: (id: string, sellDate: string, sellPrice: number) => Promise<void>
  showStock?: boolean
}

export function HoldingsTable({
  holdings,
  prices,
  loading,
  onDelete,
  onEdit,
  onMarkSold,
  showStock = true,
}: HoldingsTableProps) {
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  const [sellingHolding, setSellingHolding] = useState<Holding | null>(null)

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
    <>
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
                    <div className="flex gap-1 justify-end">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingHolding(holding)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onMarkSold && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-amber-600 hover:text-amber-600"
                          title="Mark as sold"
                          onClick={() => setSellingHolding(holding)}
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(holding.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit holding dialog */}
      {editingHolding && onEdit && (
        <EditHoldingDialog
          holding={editingHolding}
          onClose={() => setEditingHolding(null)}
          onSave={async (values) => {
            await onEdit(editingHolding.id, values)
            setEditingHolding(null)
          }}
        />
      )}

      {/* Mark as sold dialog */}
      {sellingHolding && onMarkSold && (
        <MarkSoldDialog
          holding={sellingHolding}
          onClose={() => setSellingHolding(null)}
          onSave={async (sellDate, sellPrice) => {
            await onMarkSold(sellingHolding.id, sellDate, sellPrice)
            setSellingHolding(null)
          }}
        />
      )}
    </>
  )
}

function EditHoldingDialog({
  holding,
  onClose,
  onSave,
}: {
  holding: Holding
  onClose: () => void
  onSave: (values: { buy_date: string; buy_price: number; quantity: number; notes?: string }) => Promise<void>
}) {
  const [buyDate, setBuyDate] = useState(holding.buy_date)
  const [buyPrice, setBuyPrice] = useState(String(holding.buy_price))
  const [quantity, setQuantity] = useState(String(holding.quantity))
  const [notes, setNotes] = useState(holding.notes ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const priceNum = parseFloat(buyPrice)
    const qtyNum = parseInt(quantity)
    if (isNaN(priceNum) || priceNum <= 0) { toast.error('Enter a valid buy price'); return }
    if (isNaN(qtyNum) || qtyNum <= 0) { toast.error('Enter a valid quantity'); return }
    setLoading(true)
    try {
      await onSave({ buy_date: buyDate, buy_price: priceNum, quantity: qtyNum, notes: notes || undefined })
      toast.success('Holding updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Holding — {holding.stock?.symbol?.replace('.KA', '') ?? ''}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-buy-date">Buy Date</Label>
            <Input
              id="edit-buy-date"
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-buy-price">Buy Price (PKR)</Label>
              <Input
                id="edit-buy-price"
                type="number"
                step="0.01"
                min="0.01"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MarkSoldDialog({
  holding,
  onClose,
  onSave,
}: {
  holding: Holding
  onClose: () => void
  onSave: (sellDate: string, sellPrice: number) => Promise<void>
}) {
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0])
  const [sellPrice, setSellPrice] = useState(String(holding.buy_price))
  const [loading, setLoading] = useState(false)

  const sellPriceNum = parseFloat(sellPrice)
  const pnlPct = !isNaN(sellPriceNum) && sellPriceNum > 0
    ? calcPnLPct(holding.buy_price, sellPriceNum)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isNaN(sellPriceNum) || sellPriceNum <= 0) { toast.error('Enter a valid sell price'); return }
    if (!confirm(`Mark ${holding.quantity} shares as sold at ${formatPrice(sellPriceNum)}?`)) return
    setLoading(true)
    try {
      await onSave(sellDate, sellPriceNum)
      toast.success('Holding marked as sold')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark as sold')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Mark as Sold — {holding.stock?.symbol?.replace('.KA', '') ?? ''}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-semibold">{formatNumber(holding.quantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Buy Price</span>
              <span className="font-mono">{formatPrice(holding.buy_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cost</span>
              <span className="font-mono">{formatCurrency(holding.buy_price * holding.quantity)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sell-date">Sell Date</Label>
            <Input
              id="sell-date"
              type="date"
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sell-price">Sell Price (PKR)</Label>
            <Input
              id="sell-price"
              type="number"
              step="0.01"
              min="0.01"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              required
            />
            {pnlPct != null && (
              <p className={`text-xs font-medium mt-1 ${pnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Realized P&L: {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                {' '}({formatCurrency(calcPnLAmount(holding.buy_price, sellPriceNum, holding.quantity))})
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700">
              {loading ? 'Saving...' : 'Confirm Sale'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
