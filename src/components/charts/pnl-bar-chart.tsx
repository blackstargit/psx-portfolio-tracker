'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

interface PnlBarChartProps {
  data: Array<{ symbol: string; pnlPct: number }>
}

export function PnlBarChart({ data }: PnlBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No P&L data available
      </div>
    )
  }

  const chartData = data
    .filter((d) => d.pnlPct != null)
    .sort((a, b) => b.pnlPct - a.pnlPct)
    .map((d) => ({
      symbol: d.symbol.replace('.KA', ''),
      pnl: parseFloat(d.pnlPct.toFixed(2)),
    }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <XAxis dataKey="symbol" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="%" width={40} />
        <Tooltip formatter={(v) => [`${Number(v) > 0 ? '+' : ''}${v}%`, 'P&L']} />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
