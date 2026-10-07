import { getSupabaseServerKey } from '@/lib/supabase-server-key';
// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseServerKey()
  );
}
