// app/api/auth/definir-senha/route.ts
//
// Exige uma sessão já autenticada (criada em /api/auth/verificar-identidade)
// e troca a senha aleatória temporária pelo PIN escolhido pela pessoa.

import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const novaSenha = (body?.novaSenha || "").replace(/\D/g, "");

    if (novaSenha.length < 4) {
      return NextResponse.json({ error: "O PIN precisa ter pelo menos 4 números." }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sessão expirada. Verifique sua identidade de novo." }, { status: 401 });
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      console.error("Erro ao atualizar senha:", error);
      return NextResponse.json({ error: "Não foi possível salvar o PIN." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro inesperado em definir-senha:", err);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
