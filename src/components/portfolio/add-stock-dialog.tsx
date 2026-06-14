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
import { StockSearch } from './stock-search'
import type { Sector } from '@/types'

interface AddStockDialogProps {
  sectors: Sector[]
  onAdd: (values: { symbol: string; name: string; sector_id: string; notes?: string }) => Promise<void>
}

export function AddStockDialog({ sectors, onAdd }: AddStockDialogProps) {
  const [open, setOpen] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setSymbol('')
    setName('')
    setSectorId('')
    setNotes('')
  }

  const handleSelect = (result: { symbol: string; name: string }) => {
    setSymbol(result.symbol)
    setName(result.name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symbol || !name || !sectorId) return
    setLoading(true)
    try {
      await onAdd({ symbol, name, sector_id: sectorId, notes: notes || undefined })
      toast.success(`${symbol.replace('.KA', '')} added to tracked stocks`)
      setOpen(false)
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger className={buttonVariants({ size: 'sm', variant: 'outline' })}>
        <Plus className="h-4 w-4 mr-2" />
        Track New Stock
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Track New Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Search PSX Stock</Label>
            <StockSearch onSelect={handleSelect} />
          </div>

          {symbol && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Symbol</Label>
                <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} required />
              </div>
              <div className="space-y-1">
                <Label>Sector</Label>
                <Select value={sectorId} onValueChange={(v) => setSectorId(v ?? '')} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {symbol && (
            <>
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any notes about this stock..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Stock'}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
