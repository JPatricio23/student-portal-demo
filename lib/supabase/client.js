import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wsobdpzfyghbhleglgdu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzb2JkcHpmeWdoYmhsZWdsZ2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDEzMzAsImV4cCI6MjA5MTcxNzMzMH0.ylu9dTqDxuUGw0DEloSmzpGKG77DkkL7yHblMsVnlWk'


export const supabase = createClient(supabaseUrl, supabaseAnonKey)