# PSX Portfolio Tracker

A personal portfolio tracker for the **Pakistan Stock Exchange (PSX)**. Track holdings across multiple buy lots, monitor live prices scraped directly from PSX, plan monthly investments by sector, and record dividends — all in Pakistani Rupees (₨).

Built with Next.js 16, React 19, Supabase, and a pure-TypeScript PSX scraping layer (no Python, no paid market-data API).

---

## Features

- **Dashboard** — total invested, current value, P&L (amount + %), sector allocation pie chart, and per-stock P&L bar chart.
- **Portfolio** — track stocks with per-lot buy entries. Toggle between a detailed lots view and an averaged consolidated view. Inline editing, partial or full sells (selling part of a lot splits it automatically), and per-row delete.
- **Stock detail** — per-stock summary, purchase lots, dividend history, and stop-loss tracking.
- **Sectors** — define sector buckets with target allocation percentages (summing to 100%) and visualize current allocation.
- **Monthly Planner** — a wizard to build monthly investment plans: set a budget, allocate across sectors and stocks with live price calculations, then save as draft or finalize with computed shares-to-buy and stop-loss levels.
- **Dividends** — record dividend events (cash / bonus / special) and see your income per stock.
- **Live PSX prices** — quotes and stock search scraped directly from `dps.psx.com.pk` in TypeScript, with a two-level (in-memory + Supabase) price cache.
- **Auth** — Supabase Auth (email/password) with middleware-protected routes and Row Level Security on every table.
- **Responsive** — desktop sidebar navigation and mobile bottom nav.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev) |
| Database & Auth | [Supabase](https://supabase.com) (Postgres) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Charts | [Recharts](https://recharts.org) |
| Market data | Custom PSX scraper (`cheerio` + `fetch`) |
| Language | TypeScript |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_...`) |
| `SUPABASE_DB_PASSWORD` | Database password (for `supabase` CLI migrations) |

Login is handled by **Supabase Auth** — create your user under **Authentication → Users** in the Supabase dashboard. There are no app-level username/password env vars.

### 3. Set up the database

Apply the schema migration to your Supabase project:

```bash
npx supabase db push
```

This creates the `sectors`, `stocks`, `holdings`, `monthly_plans`, `plan_allocations`, `dividends`, and `price_cache` tables, plus the `consolidated_holdings` view.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:8010](http://localhost:8010).

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the dev server on port 8010 |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Run ESLint |

## Deployment

The app is configured for [Netlify](https://www.netlify.com) (see `netlify.toml`) via `@netlify/plugin-nextjs`. Set the environment variables from `.env.local.example` in your Netlify site settings — do **not** commit real credentials.

## License

This is a personal project. Not licensed for redistribution.
