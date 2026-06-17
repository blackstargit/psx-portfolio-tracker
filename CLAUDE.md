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
- **API routes** scrape PSX terminal data directly in **TypeScript** (server-side, Node runtime). No Python, no `child_process`, no third-party data package — the scraping/refinement logic was ported from the reference `psxdata` library into `src/lib/psx/` (see `foreign-repos/` for the originals).
- **Price cache**: Two-level — in-memory module cache in `src/lib/psx/` (15-min TTL, mirrors the reference lib) + Supabase `price_cache` table for cross-request persistence.
- **Currency**: PKR (₨). All amounts in rupees. **Symbols are stored plain** (e.g. `HBL`, `LUCK`) in the `stocks` table, the `price_cache` table, and the price map the frontend reads — there is **no `.KA` suffix**. (`.KA` was a Yahoo Finance/Karachi convention; it is dead now that we scrape PSX, which uses plain symbols.) `fetchQuotes` keys its result by the exact symbol requested, and the frontend looks prices up with `prices[holding.stock.symbol]`, so the request/lookup forms must match. The leftover `PSX_SYMBOL_SUFFIX = '.KA'` constant and the scattered `.replace('.KA', '')` display calls are harmless no-ops on plain symbols.
- **Runtime deps**: `cheerio` (HTML table parsing) + global `fetch`. No Python required.
- **PSX data source**: `https://dps.psx.com.pk` — plain AJAX endpoints fetched with `fetch` + parsed with `cheerio`. No browser/Playwright needed.
  - Live prices: `GET /screener` (full table, ~735 symbols incl. inactive scrips like ENGRO; `price` column; filtered in-memory, cached 15 min). Note: the `/trading-board/REG/main` board was rejected — it omits ~240 symbols (no ENGRO) and has no current-price column.
  - Stock search: `GET /symbols` (JSON, ~1029 symbols with `name`/`sectorName`/`isETF`/`isDebt`; cached 15 min)
  - Dividends: `GET /financial-reports-list` — **currently returns only an empty table shell**; the rows are JS-loaded from an undiscovered endpoint, so dividend auto-fetch yields nothing (graceful empty, no crash). This was equally broken under the old Python version. Manual dividend entry is the working path.

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
      page.tsx                        # Dividend history, PSX fetch, manual add (route: /dividends)
    planner/
      page.tsx                        # Monthly plans list (route: /planner)
      new/
        page.tsx                      # New plan wizard: setup → allocate (review step NOT implemented)
      [planId]/
        page.tsx                      # Plan detail: allocations by sector (route: /planner/:id)
    api/
      prices/
        refresh/route.ts              # POST — refresh all active stock prices via PSX scraping → saves to price_cache
      stocks/
        quote/route.ts                # GET ?symbols=A,B,C — fetch quotes from PSX → saves to price_cache
        search/route.ts               # GET ?q=query — search PSX stocks (calls searchPSXStocks)
        dividends/route.ts            # GET ?symbol=X — fetch dividend events from PSX (dates/types only)

  lib/
    psx/                              # PSX scraping layer — pure TypeScript (no Python)
      constants.ts                    # Endpoints, request headers, retry config, COLUMN_MAP, cache TTL
      http.ts                         # fetch wrapper: PSX headers + timeout + 5xx/network retry (port of base.py)
      html-table.ts                   # cheerio HTML <table> parser (port of parsers/html.py)
      normalizers.ts                  # coerceNumeric / parseDateToISO / normalizeColumnName (port of normalizers.py)
      quote.ts                        # fetchQuotes() — live prices via /screener, cached 15 min → PSXQuoteResult
      search.ts                       # searchPSXStocks() — /symbols JSON, filtered in-memory → PSXSearchResult[]
      dividends.ts                    # fetchDividends() — /financial-reports-list → PSXDividendEvent[] (see Architecture caveat)
      types.ts                        # Shared TypeScript result types

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
    (psx/ is the only external-data layer — see above; the old yahoo/ dir was deleted)

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

Supabase project: see `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`

| Table | Purpose | Key columns |
|---|---|---|
| `sectors` | Sector buckets with allocation % | `name`, `allocation_pct` (must sum to 100), `display_order` |
| `stocks` | Tracked PSX stocks | `symbol` (plain, e.g. `HBL`), `name`, `sector_id`, `is_active` |
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
| `cheerio` | ^1.x | HTML table parsing for the PSX scraper (`src/lib/psx/`). Replaced the Python `psxdata` dependency |

---

## Feature Status

### Done ✅
- Dashboard: summary cards (invested, value, P&L amount, P&L %), sector pie chart, P&L bar chart, holding count stats
- Portfolio page: lots view (HoldingsTable) + consolidated view (ConsolidatedView), add stock dialog with PSX search, add holding dialog
- Stock detail page `/portfolio/[stockId]`: per-stock summary cards, purchase lots, dividend history sub-table, notes
- Sectors page: allocation overview bar, sector list with expand/collapse, add/edit/delete sector
- Dividends page: total income summary, per-stock PSX fetch buttons, manual add/edit/delete, dividend table with your-income column
- Monthly Planner list page: plan cards with status badge
- New Plan wizard: setup step (month/budget/notes) + allocate step (per-sector stock % inputs with live price calculations)
- Plan detail page: allocations grouped by sector with shares/stop-loss/remaining columns, finalize button
- All Supabase CRUD hooks for every entity
- PSX terminal scraping via `psxdata` Python library: quote fetch (screener, 15-min cache), stock search (symbols), dividend events (financial reports — dates/types only, no per-share amounts)
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

**Last updated**: 2026-06-16 (Session 5)

### What was done this session
- **Rewrote the entire PSX scraper layer in pure TypeScript**, removing Python and the runtime `pip install psxdata` dependency. The previous agent had wrapped the third-party `psxdata` package as a black box (and against an imagined API — search was fully broken, market_state always UNKNOWN). The data-refinement logic was instead ported from the reference repo into TS.
- New modules in `src/lib/psx/`: `constants.ts`, `http.ts` (fetch + retry), `html-table.ts` (cheerio table parser), `normalizers.ts`, and rewritten `quote.ts` / `search.ts` / `dividends.ts`.
- Deleted `runner.ts`, the 3 `psx_*.py` scripts, `requirements.txt`, and the dead `src/lib/yahoo/` directory.
- Added `cheerio`; verified live against PSX: search works (was broken), quotes return correct prices (ENGRO 485.38, HBL 302.50, LUCK 469.82). `tsc` + `eslint` clean.
- **Switched the quote source from `/trading-board/REG/main` to `/screener`** — the board omits ~240 symbols (no ENGRO) and lacks a current-price column; the screener covers ~735 symbols with an explicit `price`.

### Known limitations
- **Dividend auto-fetch returns nothing.** `GET /financial-reports-list` now serves only an empty table shell — its rows are JS-loaded from an endpoint not yet identified. The scraper returns `[]` gracefully (no crash). This was equally broken under the old Python version. Manual dividend entry works.
- **Dividends never had per-share amounts from PSX** even when rows were available — `amount_per_share` must be entered manually.

### Current state
Quotes and search are TS-native and verified against live PSX. All 4 API routes consume the new layer; the price map and `price_cache.symbol` are both keyed by the **plain** symbol (the `.KA` keying was a bug — see Architecture/Currency).

### Next task
1. **Dividends data endpoint** — open `https://dps.psx.com.pk/financial-reports-list` in a browser, watch the Network tab for the XHR that populates `#reportsTable`, and point `dividends.ts` at that endpoint. (Optional — manual entry is a working fallback.)
2. **PWA setup** — Create `public/icons/` and configure `next.config.ts` with `withPWA`. High value for mobile use.
3. **Dark mode** — Wire up `next-themes` ThemeProvider in layout and add a toggle button.
