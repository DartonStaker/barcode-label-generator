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
      products: {
        Row: {
          id: string
          code: string | null
          description: string | null
          price: string | null
          data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code?: string | null
          description?: string | null
          price?: string | null
          data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string | null
          description?: string | null
          price?: string | null
          data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      qr_codes: {
        Row: {
          id: string
          title: string
          type: 'url' | 'discount' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard'
          status: 'active' | 'inactive' | 'archived'
          payload: string
          short_url: string
          scans: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          type: 'url' | 'discount' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard'
          status?: 'active' | 'inactive' | 'archived'
          payload: string
          short_url: string
          scans?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: 'url' | 'discount' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard'
          status?: 'active' | 'inactive' | 'archived'
          payload?: string
          short_url?: string
          scans?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      qr_code_type: 'url' | 'discount' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard'
      qr_code_status: 'active' | 'inactive' | 'archived'
    }
  }
}

