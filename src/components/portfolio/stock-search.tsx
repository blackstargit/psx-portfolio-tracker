'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
}

interface StockSearchProps {
  onSelect: (result: SearchResult) => void
  placeholder?: string
}

export function StockSearch({ onSelect, placeholder = 'Search PSX stocks...' }: StockSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    fetch(`/api/stocks/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results ?? [])
        setOpen(true)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  const handleSelect = (result: SearchResult) => {
    onSelect(result)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left"
              onMouseDown={() => handleSelect(r)}
            >
              <span className="font-mono text-sm font-semibold text-primary">
                {r.symbol.replace('.KA', '')}
              </span>
              <span className="text-sm text-muted-foreground truncate">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
