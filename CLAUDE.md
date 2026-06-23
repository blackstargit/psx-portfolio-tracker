<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


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
  - Dividends: `POST /company/payouts` (with `{symbol}` form param and company-specific Referer) — returns HTML table of payout history with dates, details (e.g. "60%(i)(D)"), and book-closure dates. `fetchPayouts()` in `src/lib/psx/payouts.ts` parses this and computes `amount_per_share = pct/100 × Rs 10 face value`. This is the live dividend source as of Session 7. `GET /financial-reports-list` still returns an empty JS-rendered shell and is unused.

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
        dividends/route.ts            # GET ?symbol=X — fetch payout history from PSX via /company/payouts → real per-share amounts
        historical/route.ts           # GET ?symbol=X&from=YYYY-MM-DD — OHLCV price history from PSX

  lib/
    psx/                              # PSX scraping layer — pure TypeScript (no Python)
      constants.ts                    # Endpoints, request headers, retry config, COLUMN_MAP, cache TTL
      http.ts                         # fetch wrapper: PSX headers + timeout + 5xx/network retry (port of base.py)
      html-table.ts                   # cheerio HTML <table> parser (port of parsers/html.py)
      normalizers.ts                  # coerceNumeric / parseDateToISO / normalizeColumnName (port of normalizers.py)
      quote.ts                        # fetchQuotes() — live prices via /screener, cached 15 min → PSXQuoteResult
      search.ts                       # searchPSXStocks() — /symbols JSON, filtered in-memory → PSXSearchResult[]
      dividends.ts                    # fetchDividends() — /financial-reports-list (stub — returns empty; rows are JS-loaded)
      payouts.ts                      # fetchPayouts() — POST /company/payouts → PSXDividendEvent[] with real per-share amounts
      historical.ts                   # fetchOHLCV() — POST /historical → full OHLCV bar history → PSXHistoryResult
      types.ts                        # Shared TypeScript result types (PSXPriceEntry, PSXQuoteResult, PSXDividendEvent, PSXOHLCV)

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
      price-history-chart.tsx         # Per-stock OHLCV price history chart (lightweight-charts)
    ui/                               # shadcn/ui primitives (alert, badge, button, card, command,
                                      # dialog, input, input-group, label, popover, scroll-area,
                                      # select, separator, sheet, skeleton, sonner, switch,
                                      # table, tabs, textarea, tooltip, sort-button)

  hooks/
    use-holdings.ts                   # CRUD for holdings + consolidated_holdings view; markSold supports partial sells
    use-stocks.ts                     # CRUD for stocks
    use-sectors.ts                    # CRUD for sectors + totalAllocation sum
    use-prices.ts                     # Price fetching with 30s refresh cooldown
    use-dividends.ts                  # CRUD for dividends + PSX upsert
    use-plans.ts                      # CRUD for monthly_plans; usePlan(id) for detail
    use-sort.ts                       # Reusable sort state + sortRows() helper
    use-historical-prices.ts          # Fetch + cache OHLCV history per symbol (used on stock detail page)
    use-debounce.ts                   # Generic debounce hook (used in stock-search)
    index.ts                          # Re-exports all hooks

  lib/
    calculations.ts                   # Pure math: P&L, stop-loss, planner amounts
    constants.ts                      # STOP_LOSS_FACTOR=0.85, TTLs, PSX market hours, currency
    formatters.ts                     # Currency, percent, date, month, price formatters
    utils.ts                          # cn() (clsx + tailwind-merge)
    supabase/
      client.ts                       # Browser Supabase client (singleton)
      middleware.ts                   # updateSession() — refreshes auth session on every request (used by proxy.ts)
      server.ts                       # Server-side Supabase client (for API routes)
      database.types.ts               # Generated types — regenerate with:
                                      # npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
    (psx/ is the only external-data layer — see above; the old yahoo/ dir was deleted)

  proxy.ts                            # Next.js 16 middleware (replaces middleware.ts convention) — calls updateSession()

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
- New Plan wizard: setup step (month/budget/notes) → allocate step (facilitator mode — any % combination allowed, informational tri-state badge: green=100%, yellow<100%, orange>100%, Next gate requires only one selection) → review step (full summary table, Save as Draft / Finalize)
- Mobile nav bar (`MobileNav`) fixed on all pages — `overflow-x-hidden` on body + `min-w-0` on content flex item prevents horizontal overflow from breaking `position: fixed` on iOS Safari
- Plan detail page: allocations grouped by sector with shares/stop-loss/remaining columns, finalize button
- All Supabase CRUD hooks for every entity
- PSX terminal scraping in pure TypeScript: quote fetch (screener, 15-min cache), stock search (symbols endpoint), dividend payout history (`POST /company/payouts` — real per-share amounts auto-populated on fetch)
- Authentication: login page with session cookie, middleware protection, logout button in sidebar
- Responsive layout: sidebar on desktop, bottom nav on mobile
- PWA manifest.json

### Incomplete / Not Done ❌
1. **PWA icons missing** — `public/icons/` directory does not exist. `manifest.json` references `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`. App cannot be installed as a PWA.
2. **PWA service worker not configured** — `@ducanh2912/next-pwa` is installed but `next.config.ts` is empty. Must wrap the config with `withPWA()`.
3. **Dark mode toggle missing** — `next-themes` is installed but `ThemeProvider` is not in `layout.tsx` and there is no toggle button in the header or sidebar.
4. **Stop-loss factor not configurable** — Hardcoded at 15% in `src/lib/constants.ts` (`STOP_LOSS_FACTOR = 0.85`). No settings page.

---

## Session Handoff

**Last updated**: 2026-06-23 (Session 7)

### What was done this session
- **PSX dividend payouts scraper** (`src/lib/psx/payouts.ts`): New `fetchPayouts(symbol)` hits `POST /company/payouts` with the correct symbol-specific Referer (`https://dps.psx.com.pk/company/{SYMBOL}`). Parses the HTML table to extract book-closure start date (as ex-date), dividend type (`(D)`=cash, `(B)`=bonus, skip `(R)`=rights), and amount (`pct/100 × Rs 10 face value`). Adds `amount_per_share` field to `PSXDividendEvent` type.
- **Dividends API route updated** (`src/app/api/stocks/dividends/route.ts`): Now calls `fetchPayouts()` instead of the defunct `fetchDividends()`. Response includes real `amount_per_share` values.
- **Dividends page updated** (`src/app/(app)/dividends/page.tsx`): Maps `d.amount_per_share` (real value) instead of hardcoded `0`; uses `d.type` for DB `dividend_type`; toast no longer says "Add per-share amounts manually".
- **psxPost gains extraHeaders** (`src/lib/psx/http.ts`): Optional third param `extraHeaders?: Record<string, string>` spread after `REQUEST_HEADERS`, allowing per-request Referer override.
- **Planner flexibility** (`src/app/(app)/planner/new/page.tsx`): Removed 100%-per-sector hard gate. `isAllocationValid()` replaced by `hasAnySelections()`. Sector badge is now purely informational (tri-state: green=100%, yellow<100%, orange>100%). Next button disabled only if zero stocks selected across all sectors.
- **Mobile navbar fix** (`src/app/layout.tsx`, `src/app/(app)/layout.tsx`): Added `overflow-x-hidden` to root body and `min-w-0` to the content flex container. Prevents horizontal overflow (from wide tables on the Sectors page) from breaking `position: fixed` on iOS Safari.

### Known limitations
- Face value assumption: `fetchPayouts()` uses Rs 10 face value for all symbols. Companies with Rs 5 or Rs 2.5 par value will have amounts off by 2× or 4×. Users can correct via the manual-edit button.
- Bonus dividend `amount_per_share` is set to the same `pct/100 × 10` formula, which is technically the ratio of new shares issued, not a cash amount. The dividends table displays it but income calculations already skip bonus entries (`dividend_type !== 'cash'`).

### Current state
App is fully deployed on Netlify. Quotes, search, and dividend payout history all work live against PSX. Planner is in facilitator mode. Mobile nav renders correctly on all pages. `tsc` is clean (pre-existing supabase/ssr implicit-any errors unrelated to our code).

### Next task
1. **PWA setup** — create `public/icons/` with three PNG icons and configure `next.config.ts` with `withPWA()`. High value for mobile use.
2. **Dark mode** — wire up `next-themes` ThemeProvider in `(app)/layout.tsx` and add a toggle button to the sidebar or header.
3. **Face value per-stock** — optionally store `face_value` on the `stocks` table so `fetchPayouts()` can use the correct multiplier per symbol instead of defaulting to Rs 10.

---

## Session History

### Session 7 — 2026-06-23
**Goal**: Implement PSX dividend payout scraper; fix planner gate strictness; fix mobile navbar.
- Discovered `POST /company/payouts` endpoint (with symbol-specific Referer) returns full payout history. Confirmed with HBL (active stock) — ENGRO tests returned empty because it is delisted.
- Created `src/lib/psx/payouts.ts` with `fetchPayouts()`: parses payout %, book-closure date → ex-date, dividend type codes (D/B/R). Amount = `pct/100 × Rs 10`.
- Extended `psxPost()` with optional `extraHeaders` for per-request Referer. Updated `PSXDividendEvent` type with `amount_per_share: number | null`. Updated dividends API route and dividends page.
- Removed 100%-per-sector hard gate from New Plan wizard; replaced with presence check and informational tri-state badge.
- Fixed mobile navbar disappearing on Sectors page: `overflow-x-hidden` on body + `min-w-0` on content flex container.

### Session 6 — 2026-06-17
**Goal**: Partial sell support; pie chart tooltip improvement.
- Added "Qty to Sell" field to `MarkSoldDialog` in `HoldingsTable`. Selling < lot size reduces the original lot's quantity and inserts a new sold lot; full sell still marks `is_sold=true`.
- Fixed pie chart custom tooltip to show sector name in bold above the value.

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
