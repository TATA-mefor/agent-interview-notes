// Database client abstraction.
// Currently uses Supabase client (works with both Supabase Cloud and local PG).
// Future: can be swapped to a raw pg Pool for purely local deployment.
export { supabase as db } from '@/lib/supabase'
