import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0 overflow-auto pb-16 md:pb-0">
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
