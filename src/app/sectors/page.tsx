'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { SectorForm } from '@/components/sectors/sector-form'
import { AllocationBar } from '@/components/sectors/allocation-bar'
import { useStocks } from '@/hooks/use-stocks'
import { useSectors } from '@/hooks/use-sectors'
import type { Sector } from '@/types'

export default function SectorsPage() {
  const { sectors, loading, totalAllocation, createSector, updateSector, deleteSector } = useSectors()
  const { stocks } = useStocks()
  const [formOpen, setFormOpen] = useState(false)
  const [editingSector, setEditingSector] = useState<Sector | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSave = async (values: { name: string; allocation_pct: number; notes: string }) => {
    if (editingSector) {
      await updateSector(editingSector.id, values)
    } else {
      await createSector({ ...values, display_order: sectors.length })
    }
  }

  const handleDelete = async (id: string) => {
    const sectorStocks = stocks.filter((s) => s.sector_id === id)
    if (sectorStocks.length > 0) {
      toast.error(`Cannot delete: ${sectorStocks.length} stock(s) belong to this sector`)
      return
    }
    if (!confirm('Delete this sector?')) return
    try {
      await deleteSector(id)
      toast.success('Sector deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Sectors" />

      <div className="p-6 space-y-6">
        {/* Allocation overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Allocation Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <AllocationBar sectors={sectors} totalAllocation={totalAllocation} />
            )}
          </CardContent>
        </Card>

        {/* Sector list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Sectors ({sectors.length})</h2>
            <Button
              size="sm"
              onClick={() => { setEditingSector(null); setFormOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sector
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : sectors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No sectors yet. Create your first sector to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {sectors.map((sector) => {
                const sectorStocks = stocks.filter((s) => s.sector_id === sector.id)
                const isExpanded = expandedId === sector.id

                return (
                  <Card key={sector.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : sector.id)}
                            className="flex-1 flex items-center gap-3 text-left"
                          >
                            <span className="font-semibold truncate">{sector.name}</span>
                            <Badge>{sector.allocation_pct}%</Badge>
                            <Badge variant="outline" className="text-xs">{sectorStocks.length} stocks</Badge>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingSector(sector); setFormOpen(true) }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(sector.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {sector.notes && (
                            <p className="text-sm text-muted-foreground">{sector.notes}</p>
                          )}
                          {sectorStocks.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {sectorStocks.map((s) => (
                                <Badge key={s.id} variant="secondary" className="font-mono text-xs">
                                  {s.symbol.replace('.KA', '')}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No stocks in this sector yet.</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Tracked Stocks */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Tracked Stocks ({stocks.length})</h2>
          {stocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stocks tracked yet. Add stocks from the Portfolio page.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2">Symbol</th>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono font-semibold text-primary">{s.symbol.replace('.KA', '')}</td>
                      <td className="px-4 py-2">{s.name}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{s.sector?.name ?? '—'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SectorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        sector={editingSector}
        onSave={handleSave}
      />
    </div>
  )
}
