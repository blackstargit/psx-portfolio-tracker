'use client'

import { useEffect, useState } from 'react'
import { LayoutList, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { HoldingsTable } from '@/components/portfolio/holdings-table'
import { ConsolidatedView } from '@/components/portfolio/consolidated-view'
import { AddHoldingDialog } from '@/components/portfolio/add-holding-dialog'
import { AddStockDialog } from '@/components/portfolio/add-stock-dialog'
import { useHoldings } from '@/hooks/use-holdings'
import { useStocks } from '@/hooks/use-stocks'
import { useSectors } from '@/hooks/use-sectors'
import { usePrices } from '@/hooks/use-prices'

export default function PortfolioPage() {
  const { holdings, consolidated, loading, deleteHolding, addHolding } = useHoldings()
  const { stocks, createStock } = useStocks()
  const { sectors } = useSectors()
  const { prices, loading: pricesLoading, lastRefreshed, canRefresh, refreshAll, fetchPrices } = usePrices()
  const [viewMode, setViewMode] = useState<'lots' | 'consolidated'>('lots')

  const allSymbols = [...new Set(holdings.map((h) => h.stock?.symbol).filter(Boolean) as string[])]

  useEffect(() => {
    if (allSymbols.length > 0) fetchPrices(allSymbols)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Portfolio"
        onRefresh={refreshAll}
        isRefreshing={pricesLoading}
        canRefresh={canRefresh}
        lastRefreshed={lastRefreshed}
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center rounded-md border p-0.5 gap-0.5">
            <Button
              variant={viewMode === 'lots' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3"
              onClick={() => setViewMode('lots')}
            >
              <LayoutList className="h-3.5 w-3.5 mr-1.5" />
              Lots
            </Button>
            <Button
              variant={viewMode === 'consolidated' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3"
              onClick={() => setViewMode('consolidated')}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
              Consolidated
            </Button>
          </div>

          <AddStockDialog sectors={sectors} onAdd={createStock} />
          <AddHoldingDialog stocks={stocks} onAdd={addHolding} />
        </div>

        {viewMode === 'lots' ? (
          <HoldingsTable
            holdings={holdings}
            prices={prices}
            loading={loading}
            onDelete={deleteHolding}
          />
        ) : (
          <ConsolidatedView
            holdings={consolidated}
            prices={prices}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
