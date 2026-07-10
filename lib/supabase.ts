import { createClient } from "@supabase/supabase-js";

// Client-side kullanım: sadece user_progress tablosuna RLS ile erişir.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-only: titles tablosuna yazmak için (api route'ları içinde kullanılır).
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
