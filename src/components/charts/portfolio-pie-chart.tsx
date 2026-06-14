'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Sector } from '@/types'

const COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444',
  '#f97316', '#14b8a6', '#ec4899', '#6366f1', '#06b6d4',
]

interface SectorValue {
  sector: Sector
  value: number
}

interface PortfolioPieChartProps {
  data: SectorValue[]
}

export function PortfolioPieChart({ data }: PortfolioPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No data to display
      </div>
    )
  }

  const chartData = data
    .filter((d) => d.value > 0)
    .map((d) => ({
      name: d.sector.name,
      value: Math.round(d.value),
    }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`₨ ${Number(value).toLocaleString()}`, 'Value']}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
