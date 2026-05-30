export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          name: string
          type: string
          address: string | null
          monthly_rent: number
          payment_day: number
          status: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          address?: string | null
          monthly_rent?: number
          payment_day: number
          status?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          address?: string | null
          monthly_rent?: number
          payment_day?: number
          status?: string
          user_id?: string
          created_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          property_id: string | null
          full_name: string
          phone: string | null
          email: string | null
          notes: string | null
          is_active: boolean
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          full_name: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          is_active?: boolean
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          full_name?: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          is_active?: boolean
          user_id?: string
          created_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          tenant_id: string
          property_id: string
          start_date: string
          end_date: string
          rent_amount: number
          deposit_amount: number
          file_url: string | null
          notes: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          start_date: string
          end_date: string
          rent_amount: number
          deposit_amount?: number
          file_url?: string | null
          notes?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          start_date?: string
          end_date?: string
          rent_amount?: number
          deposit_amount?: number
          file_url?: string | null
          notes?: string | null
          user_id?: string
          created_at?: string
        }
      }
      rent_periods: {
        Row: {
          id: string
          tenant_id: string
          property_id: string
          year: number
          month: number
          due_date: string
          expected_amount: number
          paid_amount: number
          status: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          year: number
          month: number
          due_date: string
          expected_amount: number
          paid_amount?: number
          status?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          year?: number
          month?: number
          due_date?: string
          expected_amount?: number
          paid_amount?: number
          status?: string
          user_id?: string
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          rent_period_id: string
          tenant_id: string
          property_id: string
          payment_date: string
          amount: number
          method: string
          description: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          rent_period_id: string
          tenant_id: string
          property_id: string
          payment_date: string
          amount: number
          method: string
          description?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          rent_period_id?: string
          tenant_id?: string
          property_id?: string
          payment_date?: string
          amount?: number
          method?: string
          description?: string | null
          user_id?: string
          created_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          payment_id: string
          tenant_id: string
          property_id: string
          file_url: string
          file_type: string
          user_id: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          tenant_id: string
          property_id: string
          file_url: string
          file_type: string
          user_id: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          tenant_id?: string
          property_id?: string
          file_url?: string
          file_type?: string
          user_id?: string
          uploaded_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          telegram_chat_id: string | null
          daily_summary_enabled: boolean
          daily_summary_time: string
          overdue_alert_enabled: boolean
          contract_alert_days: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          telegram_chat_id?: string | null
          daily_summary_enabled?: boolean
          daily_summary_time?: string
          overdue_alert_enabled?: boolean
          contract_alert_days?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          telegram_chat_id?: string | null
          daily_summary_enabled?: boolean
          daily_summary_time?: string
          overdue_alert_enabled?: boolean
          contract_alert_days?: number
          updated_at?: string
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
  }
}
