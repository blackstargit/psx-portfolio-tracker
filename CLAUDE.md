@AGENTS.md

# PSX Portfolio Tracker — Project Reference

## How to Update This File

When told **"update CLAUDE.md"**, an agent must:
1. `ls` the full `src/` tree and compare it against the **File Structure** section below. Add/remove entries.
2. Check `package.json` for any version or dependency changes and update **Packages**.
3. Audit each page and component in `src/app/` and `src/components/` for new or removed features. Update **Feature Status**.
4. Rewrite the **Session Handoff** section with: what was accomplished this session, what is currently broken, and the exact next task for the next agent.
5. Do NOT change the **Update Protocol** (this section), **Database Schema**, or **Breaking Changes** unless those actually changed.

---

## Next.js 16 Breaking Changes

> This is Next.js **16.2.9**, not 15 or 14. Read `node_modules/next/dist/docs/` before writing any new route or API code.

**Dynamic route params are Promises.** In `page.tsx` files with dynamic segments, params arrive as `Promise<{...}>`. Unwrap with React 19's `use()` hook — do NOT destructure directly:

```tsx
// ✅ Correct (Next.js 16 + React 19)
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
}

// ❌ Wrong (Next.js 14/15 style — will fail)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}
```

Both existing dynamic routes (`/portfolio/[stockId]` and `/planner/[planId]`) already use `use(params)` correctly.

---

## Architecture

- **All pages are `'use client'`** — no server-side rendering or RSC data fetching. Data loads in the browser via custom hooks.
- **Data layer**: Custom React hooks in `src/hooks/` call Supabase directly from the browser using the anon client.
- **API routes** exist only to proxy Yahoo Finance calls (server-side, to hide the library and avoid CORS).
- **Price cache**: Two-level — in-memory Map per server process lifetime (`src/lib/yahoo/quote.ts`) + Supabase `price_cache` table for cross-request persistence. TTL is 5 min during PSX market hours, 60 min outside.
- **Currency**: PKR (₨). All amounts in rupees. Symbols use `.KA` suffix for Yahoo Finance (e.g. `HBL.KA`).

---

## File Structure

```
src/
  app/
    page.tsx                          # Dashboard (route: /)
    layout.tsx                        # Root layout — Sidebar + MobileNav + Toaster + TooltipProvider
    globals.css
    portfolio/
      page.tsx                        # Holdings list with lots/consolidated toggle (route: /portfolio)
      [stockId]/
        page.tsx                      # Per-stock detail: lots, dividends, stop-loss (route: /portfolio/:id)
    sectors/
      page.tsx                        # Sector allocation management (route: /sectors)
    dividends/
      page.tsx                        # Dividend history, Yahoo fetch, manual add (route: /dividends)
    planner/
      page.tsx                        # Monthly plans list (route: /planner)
      new/
        page.tsx                      # New plan wizard: setup → allocate (review step NOT implemented)
      [planId]/
        page.tsx                      # Plan detail: allocations by sector (route: /planner/:id)
    api/
      prices/
        refresh/route.ts              # POST — refresh all active stock prices via Yahoo → saves to price_cache
      stocks/
        quote/route.ts                # GET ?symbols=A,B,C — fetch quotes from Yahoo → saves to price_cache
        search/route.ts               # GET ?q=query — search PSX stocks via Yahoo Finance
        dividends/route.ts            # GET ?symbol=X — fetch dividend history from Yahoo Finance

  components/
    layout/
      header.tsx                      # Page header with title + refresh button
      sidebar.tsx                     # Desktop sidebar nav (hidden on mobile)
      mobile-nav.tsx                  # Bottom nav bar (mobile only)
    portfolio/
      holdings-table.tsx              # Holdings table — has Edit2 icon imported but edit is NOT wired up
      consolidated-view.tsx           # Averaged per-stock view
      add-holding-dialog.tsx          # Dialog to add a purchase lot
      add-stock-dialog.tsx            # Dialog to add a tracked stock (with Yahoo search)
      pnl-badge.tsx                   # Green/red P&L percentage badge
      stock-search.tsx                # Yahoo Finance stock search input
    sectors/
      sector-form.tsx                 # Create/edit sector dialog
      allocation-bar.tsx              # Visual sector allocation bar
    charts/
      portfolio-pie-chart.tsx         # Sector allocation pie (Recharts)
      pnl-bar-chart.tsx               # Per-stock P&L bar chart (Recharts)
    ui/                               # shadcn/ui primitives (alert, badge, button, card, command,
                                      # dialog, input, input-group, label, popover, scroll-area,
                                      # select, separator, sheet, skeleton, sonner, switch,
                                      # table, tabs, textarea, tooltip)

  hooks/
    use-holdings.ts                   # CRUD for holdings + consolidated_holdings view
    use-stocks.ts                     # CRUD for stocks
    use-sectors.ts                    # CRUD for sectors + totalAllocation sum
    use-prices.ts                     # Price fetching with 30s refresh cooldown
    use-dividends.ts                  # CRUD for dividends + Yahoo upsert
    use-plans.ts                      # CRUD for monthly_plans; usePlan(id) for detail
    use-debounce.ts                   # Generic debounce hook (used in stock-search)
    index.ts                          # Re-exports all hooks

  lib/
    calculations.ts                   # Pure math: P&L, stop-loss, planner amounts
    constants.ts                      # STOP_LOSS_FACTOR=0.85, TTLs, PSX market hours, currency
    formatters.ts                     # Currency, percent, date, month, price formatters
    utils.ts                          # cn() (clsx + tailwind-merge)
    supabase/
      client.ts                       # Browser Supabase client (singleton)
      server.ts                       # Server-side Supabase client (for API routes)
      database.types.ts               # Generated types — regenerate with:
                                      # npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
    yahoo/
      client.ts                       # yahoo-finance2 client instance
      quote.ts                        # fetchQuotes() — batch price fetch with in-memory cache
      search.ts                       # searchPSXStocks() — Yahoo search filtered to .KA suffix
      dividends.ts                    # fetchDividends() — historical dividend events
      types.ts                        # Shared Yahoo response types

  types/
    index.ts                          # All domain types: Sector, Stock, Holding, ConsolidatedHolding,
                                      # MonthlyPlan, PlanAllocation, Dividend, PriceData, PriceMap,
                                      # HoldingWithPnL, ConsolidatedHoldingWithPnL

supabase/
  migrations/
    001_initial_schema.sql            # Full schema — run via `npx supabase db push`

public/
  manifest.json                       # PWA manifest — references /icons/ which DO NOT EXIST yet
  *.svg                               # Default Next.js SVG assets
```

---

## Database Schema

Supabase project: `ooybauabapkkwcoyvybg` (URL: `https://ooybauabapkkwcoyvybg.supabase.co`)

| Table | Purpose | Key columns |
|---|---|---|
| `sectors` | Sector buckets with allocation % | `name`, `allocation_pct` (must sum to 100), `display_order` |
| `stocks` | Tracked PSX stocks | `symbol` (e.g. `HBL.KA`), `name`, `sector_id`, `is_active` |
| `holdings` | Per-lot buy entries | `stock_id`, `buy_date`, `buy_price`, `quantity`, `is_sold`, `sell_date`, `sell_price` |
| `monthly_plans` | Monthly investment plans | `month` (first day, e.g. `2026-07-01`), `budget`, `status` (`draft`\|`finalized`) |
| `plan_allocations` | Per-stock allocations within a plan | `plan_id`, `stock_id`, `sector_id`, `stock_pct_in_sector`, `allocated_amount`, `shares_to_buy`, `stop_loss`, `remaining_cash` |
| `dividends` | Dividend events | `stock_id`, `ex_date`, `amount_per_share`, `dividend_type` (`cash`\|`bonus`\|`special`), `source` (`yahoo`\|`manual`) |
| `price_cache` | Latest fetched price per symbol | `symbol` (UNIQUE), `price`, `currency`, `market_state`, `fetched_at` |

**View**: `consolidated_holdings` — aggregates active holdings per `stock_id`: `total_quantity`, `avg_buy_price`, `total_cost`, `lot_count`, `first_buy_date`, `last_buy_date`.

All tables have `created_at` and `updated_at` (auto-updated via trigger) except `plan_allocations` (no `updated_at`) and `price_cache` (no `updated_at`).

---

## Packages

| Package | Version | Notes |
|---|---|---|
| `next` | 16.2.9 | App Router. Dynamic params are Promises — see Breaking Changes above |
| `react` / `react-dom` | 19.2.4 | `use()` hook required for async params |
| `@supabase/supabase-js` | ^2.108.1 | Browser + server clients in `src/lib/supabase/` |
| `yahoo-finance2` | ^3.15.3 | Used server-side only (API routes). Do not import in client components |
| `@ducanh2912/next-pwa` | ^10.2.9 | **Installed but NOT configured** — `next.config.ts` is empty |
| `recharts` | ^3.8.1 | Used in charts/ components |
| `next-themes` | ^0.4.6 | **Installed but NOT wired up** — no ThemeProvider in layout, no toggle UI |
| `shadcn` | ^4.11.0 | Component CLI — run `npx shadcn add <component>` to add new UI primitives |
| `sonner` | ^2.0.7 | Toast notifications. `<Toaster richColors />` in layout. Use `toast.success/error/info` |
| `cmdk` | ^1.1.1 | Command palette (used in stock search) |
| `lucide-react` | ^1.18.0 | Icons |
| `date-fns` | ^4.4.0 | Date utilities (available but check if used) |
| `react-day-picker` | ^10.0.1 | Date picker (available but check if used) |
| `tailwindcss` | ^4 | CSS. Config is in `postcss.config.mjs`. No `tailwind.config.ts` — v4 is config-file-free |

---

## Feature Status

### Done ✅
- Dashboard: summary cards (invested, value, P&L amount, P&L %), sector pie chart, P&L bar chart, holding count stats
- Portfolio page: lots view (HoldingsTable) + consolidated view (ConsolidatedView), add stock dialog with Yahoo search, add holding dialog
- Stock detail page `/portfolio/[stockId]`: per-stock summary cards, purchase lots, dividend history sub-table, notes
- Sectors page: allocation overview bar, sector list with expand/collapse, add/edit/delete sector
- Dividends page: total income summary, per-stock Yahoo fetch buttons, manual add/edit/delete, dividend table with your-income column
- Monthly Planner list page: plan cards with status badge
- New Plan wizard: setup step (month/budget/notes) + allocate step (per-sector stock % inputs with live price calculations)
- Plan detail page: allocations grouped by sector with shares/stop-loss/remaining columns, finalize button
- All Supabase CRUD hooks for every entity
- Yahoo Finance integration: quote fetch with in-memory + DB cache, search, dividend history
- Responsive layout: sidebar on desktop, bottom nav on mobile
- PWA manifest.json

### Incomplete / Not Done ❌
1. **PWA icons missing** — `public/icons/` directory does not exist. `manifest.json` references `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`. App cannot be installed as a PWA.
2. **PWA service worker not configured** — `@ducanh2912/next-pwa` is installed but `next.config.ts` is empty. Must wrap the config with `withPWA()`.
3. ~~**Edit holding UI not wired**~~ — **Done (Session 3).** `EditHoldingDialog` wired via `onEdit` prop in `HoldingsTable`. Available on both `/portfolio` and `/portfolio/[stockId]`.
4. ~~**Mark-as-sold UI missing**~~ — **Done (Session 3).** `MarkSoldDialog` (amber DollarSign button) shows buy summary, sell date/price, live P&L preview before confirming.
5. ~~**Planner review step not implemented**~~ — **Done (Session 3).** Allocate step ends with "Next: Review". Review step shows full per-sector table then Save as Draft / Finalize buttons.
6. **Dark mode toggle missing** — `next-themes` is installed but `ThemeProvider` is not in `layout.tsx` and there is no toggle button in the header or sidebar.
7. **Stop-loss factor not configurable** — Hardcoded at 15% in `src/lib/constants.ts` (`STOP_LOSS_FACTOR = 0.85`). No settings page.

---

## Session Handoff

**Last updated**: 2026-06-15 (Session 2)

### What was done this session
- Ran Supabase CLI setup: `supabase init`, `supabase link --project-ref ooybauabapkkwcoyvybg`, `supabase db push` (applied `001_initial_schema.sql`)
- Regenerated `src/lib/supabase/database.types.ts` from the live Supabase project
- Wrote this CLAUDE.md with full project documentation

### Current state
The app is fully scaffolded and Supabase is connected with schema applied and types generated. Running `pnpm dev` should show a working dashboard (if there's data in the DB). The incomplete items listed above (PWA icons, edit holding, mark sold, dark mode, planner review step) were NOT worked on this session.

### Next task
The highest-value incomplete items in priority order:
1. **PWA setup** — Create `public/icons/` with the three required PNG icons, then configure `next.config.ts` with `withPWA`. This makes the app installable on mobile (the primary use case for a personal stock tracker).
2. **Edit holding + mark sold** — Wire up the `Edit2` button in `holdings-table.tsx` and add a "Mark Sold" action. Both functions already exist in `use-holdings.ts`.
3. **Dark mode** — Wrap layout with `next-themes` `ThemeProvider` and add a toggle button to the header.
