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
    layout.tsx                        # Root layout — auth redirect only
    login/
      page.tsx                        # Login page
    (app)/
      layout.tsx                      # Authenticated layout — Sidebar + MobileNav + Toaster + TooltipProvider
      page.tsx                        # Dashboard (route: /)
      portfolio/
        page.tsx                      # Holdings list with lots/consolidated toggle (route: /portfolio)
        [stockId]/
          page.tsx                    # Per-stock detail: lots, dividends, stop-loss (route: /portfolio/:id)
      sectors/
        page.tsx                      # Sector allocation management (route: /sectors)
      dividends/
        page.tsx                      # Dividend history, PSX fetch, manual add (route: /dividends)
      planner/
        page.tsx                      # Monthly plans list (route: /planner)
        new/
          page.tsx                    # New plan wizard: setup → allocate → review
        [planId]/
          page.tsx                    # Plan detail: allocations by sector (route: /planner/:id)
    api/
      auth/
        logout/route.ts               # POST — clears session cookie, redirects to /login
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
      sidebar.tsx                     # Desktop sidebar nav with logout button
      mobile-nav.tsx                  # Bottom nav bar (mobile only)
    portfolio/
      holdings-table.tsx              # Holdings table with inline Edit, partial/full sell, delete per row
      consolidated-view.tsx           # Averaged per-stock view
      add-holding-dialog.tsx          # Dialog to add a purchase lot
      add-stock-dialog.tsx            # Dialog to add a tracked stock (with PSX symbol search)
      pnl-badge.tsx                   # Green/red P&L percentage badge
      stock-search.tsx                # PSX stock search input (via /api/stocks/search)
    sectors/
      sector-form.tsx                 # Create/edit sector dialog
      allocation-bar.tsx              # Visual sector allocation bar
    charts/
      portfolio-pie-chart.tsx         # Sector allocation pie (Recharts) — tooltip shows sector name + value
      pnl-bar-chart.tsx               # Per-stock P&L bar chart (Recharts)
    ui/                               # shadcn/ui primitives (alert, badge, button, card, command,
                                      # dialog, input, input-group, label, popover, scroll-area,
                                      # select, separator, sheet, skeleton, sonner, switch,
                                      # table, tabs, textarea, tooltip)

  hooks/
    use-holdings.ts                   # CRUD for holdings + consolidated_holdings view; markSold supports partial sells
    use-stocks.ts                     # CRUD for stocks
    use-sectors.ts                    # CRUD for sectors + totalAllocation sum
    use-prices.ts                     # Price fetching with 30s refresh cooldown
    use-dividends.ts                  # CRUD for dividends + PSX upsert
    use-plans.ts                      # CRUD for monthly_plans; usePlan(id) for detail
    use-sort.ts                       # Reusable sort state + sortRows() helper
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
- Dashboard: summary cards (invested, value, P&L amount, P&L %), sector pie chart (tooltip shows sector name + value), P&L bar chart, holding count stats
- Portfolio page: lots view (HoldingsTable) + consolidated view (ConsolidatedView), add stock dialog with PSX search, add holding dialog
- Holdings table: inline edit (buy date/price/qty/notes), partial or full sell (Qty to Sell field — selling less than the lot splits it into a reduced active lot + a new sold lot), delete
- Stock detail page `/portfolio/[stockId]`: per-stock summary cards, purchase lots, dividend history sub-table, notes
- Sectors page: allocation overview bar, sector list with expand/collapse, add/edit/delete sector
- Dividends page: total income summary, per-stock PSX fetch buttons, manual add/edit/delete, dividend table with your-income column
- Monthly Planner list page: plan cards with status badge
- New Plan wizard: setup step (month/budget/notes) → allocate step (per-sector stock % inputs with live price calculations) → review step (full summary table, Save as Draft / Finalize)
- Plan detail page: allocations grouped by sector with shares/stop-loss/remaining columns, finalize button
- All Supabase CRUD hooks for every entity
- PSX terminal scraping in pure TypeScript: quote fetch (screener, 15-min cache), stock search (symbols endpoint), dividend events (financial reports — graceful empty, see limitation below)
- Authentication: login page with session cookie, middleware protection, logout button in sidebar
- Responsive layout: sidebar on desktop, bottom nav on mobile
- PWA manifest.json

### Incomplete / Not Done ❌
1. **PWA icons missing** — `public/icons/` directory does not exist. `manifest.json` references `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`. App cannot be installed as a PWA.
2. **PWA service worker not configured** — `@ducanh2912/next-pwa` is installed but `next.config.ts` is empty. Must wrap the config with `withPWA()`.
3. **Dark mode toggle missing** — `next-themes` is installed but `ThemeProvider` is not in `layout.tsx` and there is no toggle button in the header or sidebar.
4. **Stop-loss factor not configurable** — Hardcoded at 15% in `src/lib/constants.ts` (`STOP_LOSS_FACTOR = 0.85`). No settings page.
5. **Dividend auto-fetch returns nothing** — `GET /financial-reports-list` returns an empty table shell; rows are JS-loaded from an undiscovered XHR endpoint. Manual dividend entry is the working path.

---

## Session Handoff

**Last updated**: 2026-06-17 (Session 6)

### What was done this session
- **Partial sell support** (`src/hooks/use-holdings.ts`, `src/components/portfolio/holdings-table.tsx`): `MarkSoldDialog` now has a "Qty to Sell" field. If qty < lot size, the original lot's quantity is reduced and a new sold lot is inserted. Full sell (qty = lot) still marks the original row `is_sold=true`. The button label changes to "Confirm Partial Sale" when selling partially, with helper text showing remaining shares.
- **Pie chart tooltip** (`src/components/charts/portfolio-pie-chart.tsx`): Custom tooltip now shows sector name in bold above the value (previously only showed the value).

### Known limitations
- Dividend auto-fetch has never worked — `GET /financial-reports-list` returns an empty shell; the actual row data is fetched by a JS-triggered XHR not yet identified. Manual entry works fine.
- `amount_per_share` must always be entered manually — PSX doesn't expose it in any currently-scraped endpoint.

### Current state
App is fully deployed on Netlify. Quotes and search are TS-native against live PSX. Auth, all CRUD, partial sells, and sorting all work. `tsc` is clean.

### Next task
1. **Dividends XHR endpoint** — open `https://dps.psx.com.pk/financial-reports-list` in a browser, watch the Network tab for the request that populates `#reportsTable`, and point `dividends.ts` at it. (Optional — manual entry is the working fallback.)
2. **PWA setup** — create `public/icons/` with three PNG icons and configure `next.config.ts` with `withPWA()`. High value for mobile use.
3. **Dark mode** — wire up `next-themes` ThemeProvider in `(app)/layout.tsx` and add a toggle button to the sidebar or header.

---

## Session History

### Session 5 — 2026-06-16
**Goal**: Fix broken PSX data layer and deploy to Netlify.
- Rewrote the entire PSX scraper layer in pure TypeScript, removing Python and the `psxdata` pip dependency. Ported scraping logic from the reference repo into `src/lib/psx/` (constants, http, html-table, normalizers, quote, search, dividends).
- Deleted `runner.ts`, the 3 `psx_*.py` scripts, `requirements.txt`, and the dead `src/lib/yahoo/` directory. Added `cheerio`.
- Switched quote source from `/trading-board/REG/main` to `/screener` — the board omitted ~240 symbols (no ENGRO) and had no current-price column.
- Fixed Netlify build failure caused by secrets scanning detecting Supabase credentials in `CLAUDE.md`; moved credentials to Netlify environment variables and redacted from the file.
- Added login page, session cookie auth, middleware protection, and logout button in sidebar.

### Session 3 — 2026-06-15 (afternoon)
**Goal**: Implement three remaining medium-priority incomplete features.
- Added `EditHoldingDialog` to `HoldingsTable` — pre-fills buy date, price, quantity, notes; wired to `updateHolding()` on both `/portfolio` and `/portfolio/[stockId]`.
- Added `MarkSoldDialog` to `HoldingsTable` — shows buy summary, sell date/price, live P&L calculation; calls `markSold()` which sets `is_sold=true`.
- Added review step to New Plan wizard — plan summary card + per-sector table + Save as Draft / Finalize buttons.

### Session 2 — 2026-06-15 (morning)
Set up Supabase CLI, applied schema migration, generated `database.types.ts`, wrote original `CLAUDE.md` and `docs/HANDOFF.md`. No feature code changes.

### Session 1 — 2026-06-14
Original agent scaffolded the entire application: all 5 pages, Supabase hooks, API routes, Yahoo Finance integration (later replaced), responsive layout, shadcn/ui, PWA manifest. Left incomplete: PWA icons/SW, edit holding UI, mark-sold UI, planner review step, dark mode.
