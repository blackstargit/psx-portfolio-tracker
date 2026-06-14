export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      sectors: {
        Row: {
          id: string
          name: string
          allocation_pct: number
          notes: string
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          allocation_pct?: number
          notes?: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          allocation_pct?: number
          notes?: string
          display_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stocks: {
        Row: {
          id: string
          symbol: string
          name: string
          sector_id: string
          notes: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          sector_id: string
          notes?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          name?: string
          sector_id?: string
          notes?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
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
        }
        Insert: {
          id?: string
          stock_id: string
          buy_date: string
          buy_price: number
          quantity: number
          notes?: string
          is_sold?: boolean
          sell_date?: string | null
          sell_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stock_id?: string
          buy_date?: string
          buy_price?: number
          quantity?: number
          notes?: string
          is_sold?: boolean
          sell_date?: string | null
          sell_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_plans: {
        Row: {
          id: string
          month: string
          budget: number
          status: 'draft' | 'finalized'
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          month: string
          budget: number
          status?: 'draft' | 'finalized'
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          month?: string
          budget?: number
          status?: 'draft' | 'finalized'
          notes?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_allocations: {
        Row: {
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
        }
        Insert: {
          id?: string
          plan_id: string
          stock_id: string
          sector_id: string
          stock_pct_in_sector: number
          sector_pct_snapshot: number
          allocated_amount: number
          price_at_plan?: number | null
          shares_to_buy?: number
          stop_loss?: number | null
          remaining_cash?: number | null
          created_at?: string
        }
        Update: {
          stock_pct_in_sector?: number
          allocated_amount?: number
          price_at_plan?: number | null
          shares_to_buy?: number
          stop_loss?: number | null
          remaining_cash?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_allocations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "monthly_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_allocations_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_allocations_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      dividends: {
        Row: {
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
        }
        Insert: {
          id?: string
          stock_id: string
          ex_date: string
          payment_date?: string | null
          amount_per_share: number
          dividend_type?: 'cash' | 'bonus' | 'special'
          source?: 'yahoo' | 'manual'
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          ex_date?: string
          payment_date?: string | null
          amount_per_share?: number
          dividend_type?: 'cash' | 'bonus' | 'special'
          source?: 'yahoo' | 'manual'
          notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividends_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      price_cache: {
        Row: {
          id: string
          symbol: string
          price: number
          currency: string
          market_state: string
          fetched_at: string
        }
        Insert: {
          id?: string
          symbol: string
          price: number
          currency?: string
          market_state?: string
          fetched_at?: string
        }
        Update: {
          price?: number
          currency?: string
          market_state?: string
          fetched_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      consolidated_holdings: {
        Row: {
          stock_id: string
          total_quantity: number
          avg_buy_price: number
          total_cost: number
          first_buy_date: string
          last_buy_date: string
          lot_count: number
        }
        Relationships: [
          {
            foreignKeyName: "holdings_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
