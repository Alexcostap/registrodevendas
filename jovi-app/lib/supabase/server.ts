// lib/supabase/server.ts
// Cliente para uso em Server Components, Route Handlers e Server Actions.
// Também usa a chave "anon" (a sessão do usuário logado é o que garante
// o acesso correto via RLS — não precisa do service_role aqui).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

// -----------------------------------------------------------------
// Cliente com service_role — USO RESTRITO.
// Só para scripts administrativos rodados fora do app (ex: convite
// em massa de promotores). JAMAIS importar isso em uma rota que
// recebe requisições do navegador.
// -----------------------------------------------------------------
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // sem prefixo NEXT_PUBLIC_ — fica só no servidor
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
