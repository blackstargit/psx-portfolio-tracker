import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatPercent } from '@/lib/formatters'

interface PnlBadgeProps {
  pct: number | null | undefined
  className?: string
  showIcon?: boolean
}

export function PnlBadge({ pct, className, showIcon = true }: PnlBadgeProps) {
  if (pct == null) return <span className="text-muted-foreground text-sm">—</span>

  const isPositive = pct > 0
  const isNegative = pct < 0

  return (
    <Badge
      className={cn(
        'gap-1 font-mono tabular-nums',
        isPositive && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        isNegative && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        !isPositive && !isNegative && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {showIcon && (
        <>
          {isPositive && <TrendingUp className="h-3 w-3" />}
          {isNegative && <TrendingDown className="h-3 w-3" />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
        </>
      )}
      {formatPercent(pct)}
    </Badge>
  )
}
