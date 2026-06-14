'use client'

import { useState } from 'react'
import { Plus, Download, Edit2, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { useDividends } from '@/hooks/use-dividends'
import { useStocks } from '@/hooks/use-stocks'
import { useHoldings } from '@/hooks/use-holdings'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Dividend } from '@/types'

export default function DividendsPage() {
  const { dividends, loading, addDividend, updateDividend, deleteDividend, upsertFromYahoo } = useDividends()
  const { stocks } = useStocks()
  const { holdings } = useHoldings()
  const [formOpen, setFormOpen] = useState(false)
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null)
  const [fetchingSymbol, setFetchingSymbol] = useState<string | null>(null)

  // Compute total received per dividend (based on holdings at that date)
  const getSharesAtDate = (stockId: string, exDate: string) => {
    const dateObj = new Date(exDate)
    return holdings
      .filter(
        (h) =>
          h.stock_id === stockId &&
          !h.is_sold &&
          new Date(h.buy_date) <= dateObj
      )
      .reduce((sum, h) => sum + h.quantity, 0)
  }

  const totalIncome = dividends
    .filter((d) => d.dividend_type === 'cash')
    .reduce((sum, d) => {
      const shares = getSharesAtDate(d.stock_id, d.ex_date)
      return sum + d.amount_per_share * shares
    }, 0)

  const handleFetchYahoo = async (stockId: string, symbol: string) => {
    setFetchingSymbol(symbol)
    try {
      const res = await fetch(`/api/stocks/dividends?symbol=${encodeURIComponent(symbol)}`)
      const data = await res.json()
      const items = (data.dividends ?? []).map((d: { date: string; amount: number }) => ({
        ex_date: new Date(d.date).toISOString().split('T')[0],
        amount_per_share: d.amount,
        dividend_type: 'cash' as const,
      }))
      if (items.length === 0) {
        toast.info(`No dividend data found for ${symbol.replace('.KA', '')} on Yahoo Finance`)
        return
      }
      await upsertFromYahoo(stockId, items)
      toast.success(`Fetched ${items.length} dividend event(s) for ${symbol.replace('.KA', '')}`)
    } catch {
      toast.error('Failed to fetch dividends from Yahoo Finance')
    } finally {
      setFetchingSymbol(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this dividend entry?')) return
    try {
      await deleteDividend(id)
      toast.success('Dividend deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Dividends" />

      <div className="p-6 space-y-6">
        {/* Summary card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Total Cash Dividends Received</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dividend Events</p>
                <p className="text-2xl font-bold">{dividends.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold">Dividend History</h2>
          <div className="flex gap-2">
            {/* Fetch all from Yahoo */}
            <div className="flex gap-1.5">
              {stocks.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFetchYahoo(s.id, s.symbol)}
                  disabled={fetchingSymbol === s.symbol}
                >
                  {fetchingSymbol === s.symbol ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1" />
                  )}
                  {s.symbol.replace('.KA', '')}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => { setEditingDividend(null); setFormOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : dividends.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No dividends recorded. Fetch from Yahoo Finance or add manually.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2">Stock</th>
                  <th className="text-left px-4 py-2">Ex-Date</th>
                  <th className="text-left px-4 py-2">Payment Date</th>
                  <th className="text-right px-4 py-2">Per Share</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-right px-4 py-2">Your Shares</th>
                  <th className="text-right px-4 py-2">Your Income</th>
                  <th className="text-left px-4 py-2">Source</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dividends.map((d) => {
                  const sharesAtDate = getSharesAtDate(d.stock_id, d.ex_date)
                  const income = d.dividend_type === 'cash' ? d.amount_per_share * sharesAtDate : null
                  return (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono font-semibold text-primary">
                        {d.stock?.symbol?.replace('.KA', '') ?? '—'}
                      </td>
                      <td className="px-4 py-2">{formatDate(d.ex_date)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{d.payment_date ? formatDate(d.payment_date) : '—'}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatCurrency(d.amount_per_share)}</td>
                      <td className="px-4 py-2"><Badge variant="secondary" className="capitalize">{d.dividend_type}</Badge></td>
                      <td className="px-4 py-2 text-right">{sharesAtDate || '—'}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-600">
                        {income != null ? formatCurrency(income) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs uppercase">{d.source}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingDividend(d); setFormOpen(true) }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(d.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DividendForm
        open={formOpen}
        onOpenChange={setFormOpen}
        dividend={editingDividend}
        stocks={stocks}
        onSave={async (values) => {
          if (editingDividend) {
            await updateDividend(editingDividend.id, values)
            toast.success('Dividend updated')
          } else {
            await addDividend({ ...values, source: 'manual' })
            toast.success('Dividend added')
          }
          setFormOpen(false)
        }}
      />
    </div>
  )
}

function DividendForm({
  open,
  onOpenChange,
  dividend,
  stocks,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  dividend: Dividend | null
  stocks: Array<{ id: string; symbol: string; name: string }>
  onSave: (values: {
    stock_id: string
    ex_date: string
    payment_date: string | null
    amount_per_share: number
    dividend_type: 'cash' | 'bonus' | 'special'
    notes: string
  }) => Promise<void>
}) {
  const [stockId, setStockId] = useState(dividend?.stock_id ?? '')
  const [exDate, setExDate] = useState(dividend?.ex_date ?? '')
  const [payDate, setPayDate] = useState(dividend?.payment_date ?? '')
  const [amount, setAmount] = useState(dividend ? String(dividend.amount_per_share) : '')
  const [type, setType] = useState<'cash' | 'bonus' | 'special'>(dividend?.dividend_type ?? 'cash')
  const [notes, setNotes] = useState(dividend?.notes ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amtNum = parseFloat(amount)
    if (isNaN(amtNum) || amtNum < 0) { toast.error('Enter a valid amount'); return }
    setLoading(true)
    try {
      await onSave({
        stock_id: stockId,
        ex_date: exDate,
        payment_date: payDate || null,
        amount_per_share: amtNum,
        dividend_type: type,
        notes,
      })
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
          <DialogTitle>{dividend ? 'Edit Dividend' : 'Add Dividend'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Stock</Label>
            <Select value={stockId} onValueChange={(v) => setStockId(v ?? '')} required>
              <SelectTrigger><SelectValue placeholder="Select stock" /></SelectTrigger>
              <SelectContent>
                {stocks.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.symbol.replace('.KA', '')} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ex-Date</Label>
              <Input type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Payment Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount Per Share (PKR)</Label>
              <Input type="number" step="0.0001" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'cash' | 'bonus' | 'special')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
