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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
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
          status: string
          file_url: string | null
          notes: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          start_date: string
          end_date: string
          rent_amount: number
          deposit_amount?: number
          status?: string
          file_url?: string | null
          notes?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          start_date?: string
          end_date?: string
          rent_amount?: number
          deposit_amount?: number
          status?: string
          file_url?: string | null
          notes?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      rent_periods: {
        Row: {
          id: string
          contract_id: string
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
          contract_id: string
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
          contract_id?: string
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
        Relationships: [
          {
            foreignKeyName: "rent_periods_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_periods_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
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
          receipt_file_url: string | null
          receipt_file_type: string | null
          receipt_original_name: string | null
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
          receipt_file_url?: string | null
          receipt_file_type?: string | null
          receipt_original_name?: string | null
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
          receipt_file_url?: string | null
          receipt_file_type?: string | null
          receipt_original_name?: string | null
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_rent_period_id_fkey"
            columns: ["rent_period_id"]
            isOneToOne: false
            referencedRelation: "rent_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      receipts: {
        Row: {
          id: string
          payment_id: string
          tenant_id: string
          property_id: string
          file_url: string
          file_type: string
          original_name: string
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
          original_name: string
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
          original_name?: string
          user_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_debt_statement: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: {
          total_expected: number
          total_paid: number
          total_debt: number
          overdue_months: number
          avg_delay_days: number
        }
      }
    }
    Enums: { [_ in never]: never }
  }
}