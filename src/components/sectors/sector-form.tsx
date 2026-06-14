'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Sector } from '@/types'

interface SectorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sector?: Sector | null
  onSave: (values: { name: string; allocation_pct: number; notes: string }) => Promise<void>
}

export function SectorForm({ open, onOpenChange, sector, onSave }: SectorFormProps) {
  const [name, setName] = useState('')
  const [allocationPct, setAllocationPct] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sector) {
      setName(sector.name)
      setAllocationPct(String(sector.allocation_pct))
      setNotes(sector.notes ?? '')
    } else {
      setName('')
      setAllocationPct('')
      setNotes('')
    }
  }, [sector, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pct = parseFloat(allocationPct)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Allocation must be between 0 and 100')
      return
    }
    setLoading(true)
    try {
      await onSave({ name: name.trim(), allocation_pct: pct, notes })
      toast.success(sector ? 'Sector updated' : 'Sector created')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sector ? 'Edit Sector' : 'Add Sector'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="sector-name">Sector Name</Label>
            <Input
              id="sector-name"
              placeholder="e.g., Banking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="allocation">Allocation %</Label>
            <Input
              id="allocation"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0"
              value={allocationPct}
              onChange={(e) => setAllocationPct(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sector-notes">Notes (optional)</Label>
            <Textarea
              id="sector-notes"
              placeholder="Notes about this sector..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
