export interface Sector {
  id: string
  name: string
  allocation_pct: number
  notes: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface Stock {
  id: string
  symbol: string // e.g., "HBL.KA"
  name: string
  sector_id: string
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined
  sector?: Sector
}

export interface Holding {
  id: string
  stock_id: string
  buy_date: string
  buy_price: number
  quantity: number
  notes: string
  is_sold: boolean
  sell_date: string | null
  sell_price: number | null
  created_at: string
  updated_at: string
  // Joined
  stock?: Stock
}

export interface ConsolidatedHolding {
  stock_id: string
  total_quantity: number
  avg_buy_price: number
  total_cost: number
  first_buy_date: string
  last_buy_date: string
  lot_count: number
  // Joined
  stock?: Stock
}

export interface MonthlyPlan {
  id: string
  month: string // "2026-07-01" (first day of month)
  budget: number
  status: 'draft' | 'finalized'
  notes: string
  created_at: string
  updated_at: string
  // Joined
  allocations?: PlanAllocation[]
}

export interface PlanAllocation {
  id: string
  plan_id: string
  stock_id: string
  sector_id: string
  stock_pct_in_sector: number
  sector_pct_snapshot: number
  allocated_amount: number
  price_at_plan: number | null
  shares_to_buy: number
  stop_loss: number | null
  remaining_cash: number | null
  created_at: string
  // Joined
  stock?: Stock
  sector?: Sector
}

export interface Dividend {
  id: string
  stock_id: string
  ex_date: string
  payment_date: string | null
  amount_per_share: number
  dividend_type: 'cash' | 'bonus' | 'special'
  source: 'yahoo' | 'manual'
  notes: string
  created_at: string
  updated_at: string
  // Joined
  stock?: Stock
}

export interface PriceData {
  symbol: string
  price: number
  currency: string
  market_state: string
  fetched_at: string
  stale: boolean
}

export type PriceMap = Record<string, PriceData>

// Computed types used in UI
export interface HoldingWithPnL extends Holding {
  current_price?: number
  current_value?: number
  pnl_amount?: number
  pnl_pct?: number
  is_price_stale?: boolean
}

export interface ConsolidatedHoldingWithPnL extends ConsolidatedHolding {
  current_price?: number
  current_value?: number
  pnl_amount?: number
  pnl_pct?: number
}
