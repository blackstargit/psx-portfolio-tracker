'use client'

import { cn } from '@/lib/utils'
import type { Sector } from '@/types'

const SECTOR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-cyan-500',
]

interface AllocationBarProps {
  sectors: Sector[]
  totalAllocation: number
}

export function AllocationBar({ sectors, totalAllocation }: AllocationBarProps) {
  const isValid = Math.abs(totalAllocation - 100) < 0.01
  const isOver = totalAllocation > 100

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-4 bg-muted gap-px">
        {sectors.map((s, i) => {
          const pct = Math.min(s.allocation_pct, 100)
          return (
            <div
              key={s.id}
              className={cn(SECTOR_COLORS[i % SECTOR_COLORS.length], 'transition-all')}
              style={{ width: `${pct}%` }}
              title={`${s.name}: ${s.allocation_pct}%`}
            />
          )
        })}
        {/* Unfilled remainder */}
        {totalAllocation < 100 && (
          <div className="flex-1 bg-muted" />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {sectors.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5 text-xs">
            <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', SECTOR_COLORS[i % SECTOR_COLORS.length])} />
            <span className="text-muted-foreground">{s.name}</span>
            <span className="font-medium">{s.allocation_pct}%</span>
          </div>
        ))}
      </div>

      {/* Total indicator */}
      <div className={cn(
        'text-sm font-medium',
        isValid ? 'text-green-600 dark:text-green-400' : isOver ? 'text-red-600' : 'text-yellow-600'
      )}>
        Total: {totalAllocation.toFixed(2)}%
        {isValid ? ' ✓' : isOver ? ' — exceeds 100%' : ` — ${(100 - totalAllocation).toFixed(2)}% unallocated`}
      </div>
    </div>
  )
}
