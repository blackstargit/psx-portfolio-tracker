'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Building2,
  CalendarRange,
  Coins,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: BookOpen },
  { href: '/sectors', label: 'Sectors', icon: Building2 },
  { href: '/planner', label: 'Planner', icon: CalendarRange },
  { href: '/dividends', label: 'Dividends', icon: Coins },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r bg-background/80 backdrop-blur-md h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <span className="text-lg font-bold tracking-tight text-primary">PSX Tracker</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
