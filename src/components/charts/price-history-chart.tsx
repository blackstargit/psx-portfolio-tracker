'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  ColorType,
} from 'lightweight-charts'
import type { PSXOHLCV } from '@/lib/psx/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PriceRange = '1D' | '1W' | '1M' | '6M' | '1Y' | 'All'
type ChartType = 'Candle' | 'Line'

const RANGE_LABELS: PriceRange[] = ['1D', '1W', '1M', '6M', '1Y', 'All']

/** Days to look back per range. null = all available bars. */
const RANGE_DAYS: Record<PriceRange, number | null> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '6M': 180,
  '1Y': 365,
  'All': null,
}

export interface BuyLot {
  id: string
  buy_price: number
  buy_date: string
  quantity: number
}

export interface PriceHistoryChartProps {
  bars: PSXOHLCV[]
  holdings: BuyLot[]
  loading?: boolean
  symbol: string
  /** Controlled range — if provided, the range buttons are hidden and this range is used. */
  externalRange?: PriceRange
  /** Called when the user changes the range (uncontrolled mode). */
  onRangeChange?: (range: PriceRange) => void
  className?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sliceBars(bars: PSXOHLCV[], range: PriceRange): PSXOHLCV[] {
  const days = RANGE_DAYS[range]
  if (days === null) return bars
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return bars.filter((b) => b.date >= cutoffStr)
}

// ─── Chart theming ───────────────────────────────────────────────────────────
// Hardcoded to match the existing dark-mode shadcn palette used in the rest of
// the app (the ThemeProvider is not yet wired up, so we can't read CSS vars at
// runtime from inside the chart canvas).
const THEME = {
  bg: 'transparent',
  text: '#a1a1aa',        // zinc-400
  grid: '#27272a',        // zinc-800
  border: '#27272a',
  upColor: '#22c55e',     // green-500  (matches pnl-bar-chart)
  downColor: '#ef4444',   // red-500
  buyLine: '#ef4444',
  lineColor: '#3b82f6',   // blue-500   (matches pie-chart palette)
  volUp: '#22c55e60',
  volDown: '#ef444460',
} as const

// ─── Component ───────────────────────────────────────────────────────────────

export function PriceHistoryChart({
  bars,
  holdings,
  loading = false,
  symbol,
  externalRange,
  onRangeChange,
  className,
}: PriceHistoryChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [internalRange, setInternalRange] = useState<PriceRange>('1M')
  const [chartType, setChartType] = useState<ChartType>('Candle')

  const range = externalRange ?? internalRange

  const handleRangeChange = (r: PriceRange) => {
    setInternalRange(r)
    onRangeChange?.(r)
  }

  const filteredBars = useMemo(() => sliceBars(bars, range), [bars, range])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (filteredBars.length === 0) return

    // ── Create chart ──────────────────────────────────────────────────────
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: THEME.bg },
        textColor: THEME.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: THEME.grid, style: LineStyle.Dotted },
        horzLines: { color: THEME.grid, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: 1, // Magnet
      },
      rightPriceScale: {
        borderColor: THEME.border,
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: THEME.border,
        timeVisible: false,
      },
      autoSize: true,
    })

    // ── Price series ──────────────────────────────────────────────────────
    let activeSeries: ReturnType<typeof chart.addSeries>

    if (chartType === 'Candle') {
      const cs = chart.addSeries(CandlestickSeries, {
        upColor: THEME.upColor,
        downColor: THEME.downColor,
        borderUpColor: THEME.upColor,
        borderDownColor: THEME.downColor,
        wickUpColor: THEME.upColor,
        wickDownColor: THEME.downColor,
      })
      cs.setData(
        filteredBars.map((b) => ({
          time: b.date as `${number}-${number}-${number}`,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }))
      )
      activeSeries = cs
    } else {
      const ls = chart.addSeries(LineSeries, {
        color: THEME.lineColor,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      })
      ls.setData(
        filteredBars.map((b) => ({
          time: b.date as `${number}-${number}-${number}`,
          value: b.close,
        }))
      )
      activeSeries = ls
    }

    // ── Buy-price markers ────────────────────────────────────────────────
    for (const lot of holdings) {
      const buyDate = lot.buy_date.slice(0, 10)
      // Only show lots that fall within the visible range (or always show for readability)
      activeSeries.createPriceLine({
        price: lot.buy_price,
        color: THEME.buyLine,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${lot.quantity} shares · ${buyDate}`,
      })
    }

    // ── Volume histogram (pane 1) ─────────────────────────────────────────
    const volSeries = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      },
      1 // pane index
    )

    volSeries.setData(
      filteredBars.map((b, i) => ({
        time: b.date as `${number}-${number}-${number}`,
        value: b.volume,
        color:
          i === 0 || b.close >= filteredBars[i - 1].close
            ? THEME.volUp
            : THEME.volDown,
      }))
    )

    // Make the volume pane smaller
    const panes = chart.panes()
    if (panes.length > 1) {
      panes[1].setHeight(70)
    }

    chart.timeScale().fitContent()

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      chart.remove()
    }
  }, [filteredBars, chartType, holdings])

  // ── Loading / empty states ─────────────────────────────────────────────
  const showEmpty = !loading && bars.length === 0
  const showRangeEmpty = !loading && bars.length > 0 && filteredBars.length === 0

  return (
    <div className={cn('space-y-3', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Range buttons */}
        <div className="flex gap-1">
          {RANGE_LABELS.map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => handleRangeChange(r)}
              disabled={loading}
            >
              {r}
            </Button>
          ))}
        </div>

        {/* Chart type toggle */}
        <div className="flex gap-1">
          {(['Candle', 'Line'] as ChartType[]).map((t) => (
            <Button
              key={t}
              variant={chartType === t ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setChartType(t)}
              disabled={loading}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative rounded-md border border-border overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
            <span className="text-sm text-muted-foreground">Loading chart…</span>
          </div>
        )}

        {showEmpty && (
          <div className="h-[360px] flex items-center justify-center text-muted-foreground text-sm">
            No historical data available for {symbol}
          </div>
        )}

        {showRangeEmpty && (
          <div className="h-[360px] flex items-center justify-center text-muted-foreground text-sm">
            No data in the selected range — try a longer period
          </div>
        )}

        <div
          ref={containerRef}
          className={cn(
            'h-[360px] w-full',
            (showEmpty || showRangeEmpty) && 'hidden'
          )}
        />
      </div>

      {/* Legend */}
      {holdings.length > 0 && !showEmpty && (
        <p className="text-xs text-muted-foreground">
          <span className="inline-block w-4 border-t-2 border-dashed border-red-500 mr-1 align-middle" />
          Dashed red lines = your buy prices
        </p>
      )}
    </div>
  )
}
