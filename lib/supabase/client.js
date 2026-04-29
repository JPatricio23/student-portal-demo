import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wsobdpzfyghbhleglgdu.supabase.com'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzb2JkcHpmeWdoYmhsZWdsZ2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDEzMzAsImV4cCI6MjA5MTcxNzMzMH0.ylu9TqDxuUGw0DEloSmzpGKG77DkkL7yHblMsVnlWk'

// Validate that required environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Warning: Supabase environment variables not set. Using fallback values.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)