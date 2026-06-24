'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/formatters'

interface HeaderProps {
  title: string
  onRefresh?: () => void
  isRefreshing?: boolean
  canRefresh?: boolean
  lastRefreshed?: Date | null
}

import { ThemeToggle } from '@/components/theme-toggle'

export function Header({
  title,
  onRefresh,
  isRefreshing = false,
  canRefresh = true,
  lastRefreshed,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        {lastRefreshed && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            Updated {formatDate(lastRefreshed.toISOString())}
          </span>
        )}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing || !canRefresh}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
          </Button>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
