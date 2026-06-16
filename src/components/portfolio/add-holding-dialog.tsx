'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Stock } from '@/types'

interface AddHoldingDialogProps {
  stocks: Stock[]
  onAdd: (values: {
    stock_id: string
    buy_date: string
    buy_price: number
    quantity: number
    notes?: string
  }) => Promise<void>
  defaultStockId?: string
}

export function AddHoldingDialog({ stocks, onAdd, defaultStockId }: AddHoldingDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stockId, setStockId] = useState(defaultStockId ?? '')
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0])
  const [buyPrice, setBuyPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')

  const reset = () => {
    setStockId(defaultStockId ?? '')
    setBuyDate(new Date().toISOString().split('T')[0])
    setBuyPrice('')
    setQuantity('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockId || !buyDate || !buyPrice || !quantity) return

    const priceNum = parseFloat(buyPrice)
    const qtyNum = parseInt(quantity)

    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Enter a valid buy price')
      return
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error('Enter a valid quantity')
      return
    }

    setLoading(true)
    try {
      await onAdd({
        stock_id: stockId,
        buy_date: buyDate,
        buy_price: priceNum,
        quantity: qtyNum,
        notes: notes || undefined,
      })
      toast.success('Holding added')
      setOpen(false)
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add holding')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger className={buttonVariants({ size: 'sm' })}>
        <Plus className="h-4 w-4 mr-2" />
        Add Holding
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Holding</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!defaultStockId && (
            <div className="space-y-1">
              <Label htmlFor="stock">Stock</Label>
              <Select
                items={stocks.map((s) => ({ value: s.id, label: `${s.symbol.replace('.KA', '')} — ${s.name}` }))}
                value={stockId}
                onValueChange={(v) => setStockId(v ?? '')}
                required
              >
                <SelectTrigger id="stock">
                  <SelectValue placeholder="Select stock" />
                </SelectTrigger>
                <SelectContent>
                  {stocks.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.symbol.replace('.KA', '')} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="buy-date">Buy Date</Label>
            <Input
              id="buy-date"
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="buy-price">Buy Price (PKR)</Label>
              <Input
                id="buy-price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this purchase..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Holding'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
