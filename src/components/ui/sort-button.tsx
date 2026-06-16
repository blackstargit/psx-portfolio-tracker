'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortDir } from '@/hooks/use-sort'

interface SortButtonProps {
  label: string
  /** True when this column is the active sort column. */
  active: boolean
  dir: SortDir
  onClick: () => void
  align?: 'left' | 'right' | 'center'
  className?: string
}

/**
 * A clickable table-header label with a sort-direction arrow. Inactive columns
 * show a dimmed arrow as an affordance that the header is sortable.
 */
export function SortButton({
  label,
  active,
  dir,
  onClick,
  align = 'left',
  className,
}: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1 select-none transition-colors hover:text-foreground',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center',
        active ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
    >
      <span>{label}</span>
      {active ? (
        dir === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        )
      ) : (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-30" />
      )}
    </button>
  )
}
