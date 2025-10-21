import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eewrhcifugblcjuawtsv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVld3JoY2lmdWdibGNqdWF3dHN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDA2NDYsImV4cCI6MjA3NjUxNjY0Nn0.QGBiqvpFPyRIAMJn6mlSm8rhRHg4Dw0zs5UcxsVqbVE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface UserDataset {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  column_mapping: {
    dateCol: string
    catCol: string
    valCol: string
  }
  total_rows: number
}

export interface DataRow {
  id: string
  dataset_id: string
  row_data: Record<string, any>
  created_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: 'light' | 'dark'
  default_view: 'upload' | 'analytics' | 'widget'
  created_at: string
  updated_at: string
}
