export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      dividends: {
        Row: {
          amount_per_share: number
          created_at: string | null
          dividend_type: string
          ex_date: string
          id: string
          notes: string | null
          payment_date: string | null
          source: string
          stock_id: string
          updated_at: string | null
        }
        Insert: {
          amount_per_share: number
          created_at?: string | null
          dividend_type?: string
          ex_date: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          source?: string
          stock_id: string
          updated_at?: string | null
        }
        Update: {
          amount_per_share?: number
          created_at?: string | null
          dividend_type?: string
          ex_date?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          source?: string
          stock_id?: string
          updated_at?: string | null
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
      holdings: {
        Row: {
          buy_date: string
          buy_price: number
          created_at: string | null
          id: string
          is_sold: boolean | null
          notes: string | null
          quantity: number
          sell_date: string | null
          sell_price: number | null
          stock_id: string
          updated_at: string | null
        }
        Insert: {
          buy_date: string
          buy_price: number
          created_at?: string | null
          id?: string
          is_sold?: boolean | null
          notes?: string | null
          quantity: number
          sell_date?: string | null
          sell_price?: number | null
          stock_id: string
          updated_at?: string | null
        }
        Update: {
          buy_date?: string
          buy_price?: number
          created_at?: string | null
          id?: string
          is_sold?: boolean | null
          notes?: string | null
          quantity?: number
          sell_date?: string | null
          sell_price?: number | null
          stock_id?: string
          updated_at?: string | null
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
          budget: number
          created_at: string | null
          id: string
          month: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          budget: number
          created_at?: string | null
          id?: string
          month: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          budget?: number
          created_at?: string | null
          id?: string
          month?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      plan_allocations: {
        Row: {
          allocated_amount: number
          created_at: string | null
          id: string
          plan_id: string
          price_at_plan: number | null
          remaining_cash: number | null
          sector_id: string
          sector_pct_snapshot: number
          shares_to_buy: number | null
          stock_id: string
          stock_pct_in_sector: number
          stop_loss: number | null
        }
        Insert: {
          allocated_amount: number
          created_at?: string | null
          id?: string
          plan_id: string
          price_at_plan?: number | null
          remaining_cash?: number | null
          sector_id: string
          sector_pct_snapshot: number
          shares_to_buy?: number | null
          stock_id: string
          stock_pct_in_sector?: number
          stop_loss?: number | null
        }
        Update: {
          allocated_amount?: number
          created_at?: string | null
          id?: string
          plan_id?: string
          price_at_plan?: number | null
          remaining_cash?: number | null
          sector_id?: string
          sector_pct_snapshot?: number
          shares_to_buy?: number | null
          stock_id?: string
          stock_pct_in_sector?: number
          stop_loss?: number | null
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
            foreignKeyName: "plan_allocations_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_allocations_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      price_cache: {
        Row: {
          currency: string | null
          fetched_at: string
          id: string
          market_state: string | null
          price: number
          symbol: string
        }
        Insert: {
          currency?: string | null
          fetched_at?: string
          id?: string
          market_state?: string | null
          price: number
          symbol: string
        }
        Update: {
          currency?: string | null
          fetched_at?: string
          id?: string
          market_state?: string | null
          price?: number
          symbol?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          allocation_pct: number
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          allocation_pct?: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          allocation_pct?: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stocks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          sector_id: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          sector_id: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          sector_id?: string
          symbol?: string
          updated_at?: string | null
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
    }
    Views: {
      consolidated_holdings: {
        Row: {
          avg_buy_price: number | null
          first_buy_date: string | null
          last_buy_date: string | null
          lot_count: number | null
          stock_id: string | null
          total_cost: number | null
          total_quantity: number | null
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
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
