import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://upzuvpogdracavcmxakp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwenV2cG9nZHJhY2F2Y214YWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODkzNzMsImV4cCI6MjA5NDc2NTM3M30._akzEANRa-ohHspeIzOF8lkn_--3eRLBL_YzpDLswFc',
)
