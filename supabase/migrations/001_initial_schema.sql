-- ============================================================
-- PSX Portfolio Tracker - Initial Schema
-- Run this in the Supabase SQL Editor to set up your database
-- ============================================================

-- SECTORS
CREATE TABLE IF NOT EXISTS sectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  allocation_pct NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
  notes TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- STOCKS
CREATE TABLE IF NOT EXISTS stocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,          -- e.g., "HBL.KA"
  name TEXT NOT NULL,
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE RESTRICT,
  notes TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector_id);
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);

-- HOLDINGS (per-lot buy entries)
CREATE TABLE IF NOT EXISTS holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  buy_date DATE NOT NULL,
  buy_price NUMERIC(12,2) NOT NULL CHECK (buy_price > 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  notes TEXT DEFAULT '',
  is_sold BOOLEAN DEFAULT false,
  sell_date DATE,
  sell_price NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holdings_stock ON holdings(stock_id);
CREATE INDEX IF NOT EXISTS idx_holdings_buy_date ON holdings(buy_date);

-- MONTHLY PLANS
CREATE TABLE IF NOT EXISTS monthly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL UNIQUE,           -- first day of month, e.g., '2026-07-01'
  budget NUMERIC(12,2) NOT NULL CHECK (budget > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monthly_plans_month ON monthly_plans(month);

-- PLAN ALLOCATIONS (per-stock within a monthly plan)
CREATE TABLE IF NOT EXISTS plan_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES monthly_plans(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE RESTRICT,
  stock_pct_in_sector NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (stock_pct_in_sector >= 0 AND stock_pct_in_sector <= 100),
  sector_pct_snapshot NUMERIC(5,2) NOT NULL,
  allocated_amount NUMERIC(12,2) NOT NULL,
  price_at_plan NUMERIC(12,2),
  shares_to_buy INT DEFAULT 0,
  stop_loss NUMERIC(12,2),
  remaining_cash NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, stock_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_alloc_plan ON plan_allocations(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_alloc_stock ON plan_allocations(stock_id);

-- DIVIDENDS
CREATE TABLE IF NOT EXISTS dividends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  ex_date DATE NOT NULL,
  payment_date DATE,
  amount_per_share NUMERIC(10,4) NOT NULL,
  dividend_type TEXT NOT NULL DEFAULT 'cash'
    CHECK (dividend_type IN ('cash', 'bonus', 'special')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('yahoo', 'manual')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stock_id, ex_date, dividend_type)
);

CREATE INDEX IF NOT EXISTS idx_dividends_stock ON dividends(stock_id);
CREATE INDEX IF NOT EXISTS idx_dividends_ex_date ON dividends(ex_date);

-- PRICE CACHE (one row per symbol, upserted on refresh)
CREATE TABLE IF NOT EXISTS price_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'PKR',
  market_state TEXT DEFAULT 'UNKNOWN',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_cache_symbol ON price_cache(symbol);

-- CONSOLIDATED HOLDINGS VIEW (averaged per stock)
CREATE OR REPLACE VIEW consolidated_holdings AS
SELECT
  stock_id,
  SUM(quantity) AS total_quantity,
  ROUND(SUM(buy_price * quantity) / NULLIF(SUM(quantity), 0), 2) AS avg_buy_price,
  SUM(buy_price * quantity) AS total_cost,
  MIN(buy_date) AS first_buy_date,
  MAX(buy_date) AS last_buy_date,
  COUNT(*) AS lot_count
FROM holdings
WHERE is_sold = false
GROUP BY stock_id;

-- AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON sectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON monthly_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON dividends
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
