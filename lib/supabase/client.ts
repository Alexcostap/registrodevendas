// lib/supabase/client.ts
// Cliente para uso em Client Components (navegador).
// Só usa a chave "anon" — segura de expor, porque toda proteção real
// vem das políticas de RLS aplicadas no banco (ver seguranca-rls-e-rate-limit.sql).
// NUNCA importe o service_role key aqui.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
