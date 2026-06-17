'use client'

import { useMemo, useState } from 'react'
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
import { SortButton } from '@/components/ui/sort-button'
import { formatCurrency, formatDate, formatNumber, formatPrice } from '@/lib/formatters'
import { calcPnLPct, calcPnLAmount, calcCurrentValue } from '@/lib/calculations'
import { useSort, sortRows } from '@/hooks/use-sort'
import type { Holding, PriceMap } from '@/types'

interface HoldingsTableProps {
  holdings: Holding[]
  prices: PriceMap
  loading: boolean
  onDelete: (id: string) => Promise<void>
  onEdit?: (id: string, values: { buy_date: string; buy_price: number; quantity: number; notes?: string }) => Promise<void>
  onMarkSold?: (holding: Holding, sellQuantity: number, sellDate: string, sellPrice: number) => Promise<void>
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
          case 'buyDate':
            return new Date(h.buy_date).getTime()
          case 'buyPrice':
            return h.buy_price
          case 'qty':
            return h.quantity
          case 'cost':
            return h.buy_price * h.quantity
          case 'currentPrice':
            return cp
          case 'value':
            return cp != null ? calcCurrentValue(cp, h.quantity) : null
          case 'pnl':
            return cp != null ? calcPnLAmount(h.buy_price, cp, h.quantity) : null
          case 'pnlPct':
            return cp != null ? calcPnLPct(h.buy_price, cp) : null
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
              {showStock && (
                <TableHead>
                  <SortButton label="Stock" active={sort.key === 'stock'} dir={sort.dir} onClick={() => toggle('stock')} />
                </TableHead>
              )}
              {showStock && (
                <TableHead>
                  <SortButton label="Sector" active={sort.key === 'sector'} dir={sort.dir} onClick={() => toggle('sector')} />
                </TableHead>
              )}
              <TableHead>
                <SortButton label="Buy Date" active={sort.key === 'buyDate'} dir={sort.dir} onClick={() => toggle('buyDate')} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Buy Price" align="right" active={sort.key === 'buyPrice'} dir={sort.dir} onClick={() => toggle('buyPrice')} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Qty" align="right" active={sort.key === 'qty'} dir={sort.dir} onClick={() => toggle('qty')} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Cost" align="right" active={sort.key === 'cost'} dir={sort.dir} onClick={() => toggle('cost')} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Current Price" align="right" active={sort.key === 'currentPrice'} dir={sort.dir} onClick={() => toggle('currentPrice')} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="Value" align="right" active={sort.key === 'value'} dir={sort.dir} onClick={() => toggle('value')} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="P&L" align="right" active={sort.key === 'pnl'} dir={sort.dir} onClick={() => toggle('pnl')} />
              </TableHead>
              <TableHead className="text-right">
                <SortButton label="P&L %" align="right" active={sort.key === 'pnlPct'} dir={sort.dir} onClick={() => toggle('pnlPct')} />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((holding) => {
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
          onSave={async (sellQuantity, sellDate, sellPrice) => {
            await onMarkSold(sellingHolding, sellQuantity, sellDate, sellPrice)
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
  onSave: (sellQuantity: number, sellDate: string, sellPrice: number) => Promise<void>
}) {
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0])
  const [sellPrice, setSellPrice] = useState(String(holding.buy_price))
  const [sellQty, setSellQty] = useState(String(holding.quantity))
  const [loading, setLoading] = useState(false)

  const sellPriceNum = parseFloat(sellPrice)
  const sellQtyNum = parseInt(sellQty)
  const isPartial = !isNaN(sellQtyNum) && sellQtyNum > 0 && sellQtyNum < holding.quantity

  const pnlPct = !isNaN(sellPriceNum) && sellPriceNum > 0
    ? calcPnLPct(holding.buy_price, sellPriceNum)
    : null
  const pnlAmount = !isNaN(sellPriceNum) && !isNaN(sellQtyNum) && sellQtyNum > 0
    ? calcPnLAmount(holding.buy_price, sellPriceNum, sellQtyNum)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isNaN(sellPriceNum) || sellPriceNum <= 0) { toast.error('Enter a valid sell price'); return }
    if (isNaN(sellQtyNum) || sellQtyNum <= 0) { toast.error('Enter a valid quantity'); return }
    if (sellQtyNum > holding.quantity) { toast.error(`Cannot sell more than ${holding.quantity} shares`); return }
    const confirmMsg = isPartial
      ? `Sell ${sellQtyNum} of ${holding.quantity} shares at ${formatPrice(sellPriceNum)}? (${holding.quantity - sellQtyNum} shares will remain)`
      : `Mark all ${holding.quantity} shares as sold at ${formatPrice(sellPriceNum)}?`
    if (!confirm(confirmMsg)) return
    setLoading(true)
    try {
      await onSave(sellQtyNum, sellDate, sellPriceNum)
      toast.success(isPartial ? 'Partial sale recorded' : 'Holding marked as sold')
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
            Sell — {holding.stock?.symbol?.replace('.KA', '') ?? ''}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lot Qty</span>
              <span className="font-semibold">{formatNumber(holding.quantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buy Price</span>
              <span className="font-mono">{formatPrice(holding.buy_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lot Cost</span>
              <span className="font-mono">{formatCurrency(holding.buy_price * holding.quantity)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sell-qty">Qty to Sell</Label>
            <Input
              id="sell-qty"
              type="number"
              min="1"
              max={holding.quantity}
              step="1"
              value={sellQty}
              onChange={(e) => setSellQty(e.target.value)}
              required
            />
            {isPartial && (
              <p className="text-xs text-muted-foreground">
                Partial sell — {holding.quantity - sellQtyNum} shares will remain in this lot
              </p>
            )}
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
            {pnlPct != null && pnlAmount != null && (
              <p className={`text-xs font-medium mt-1 ${pnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Realized P&L: {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                {' '}({formatCurrency(pnlAmount)})
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700">
              {loading ? 'Saving...' : isPartial ? 'Confirm Partial Sale' : 'Confirm Sale'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
