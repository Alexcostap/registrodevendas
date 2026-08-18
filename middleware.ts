// middleware.ts (raiz do projeto)
// Primeira camada de defesa: sem sessão válida, nem chega a carregar a
// tela. A proteção "de verdade" continua sendo a RLS no banco — isto
// aqui é UX + defesa em profundidade, não o único bloqueio.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;
  // /login/definir-senha PRECISA de sessão ativa (criada em
  // verificar-identidade) — não pode ser tratada como "página de login
  // para deslogados", senão o usuário é chutado pra Home antes de
  // conseguir criar o PIN.
  const isPaginaDeslogado = pathname === "/login" || pathname === "/login/primeiro-acesso";
  const isAreaLogin = pathname.startsWith("/login");

  if (!session && isAreaLogin && !isPaginaDeslogado) {
    // ex: acessou /login/definir-senha sem sessão -> manda pro login normal
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!session && !isAreaLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (session && isPaginaDeslogado) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

// Aplica a todas as rotas, exceto assets estáticos
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
