// app/api/ocr/route.ts
// Única rota que conhece a chave da Anthropic. O front-end (app-jovi)
// deve chamar ESTA rota (fetch("/api/ocr", ...)), nunca a API da
// Anthropic diretamente — do contrário a chave vazaria no bundle do navegador.

import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const LIMITE_REQUISICOES = 20; // por usuário, por janela
const JANELA_SEGUNDOS = 3600; // 1 hora
const TAMANHO_MAXIMO_BASE64 = 8_000_000; // ~6MB de imagem original

export async function POST(request: Request) {
  const supabase = createClient();

  // 1) Exige sessão válida — sem isso, 401 imediato.
  //    Isso é o que impede "brecha de login sem autenticação" neste endpoint.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 2) Rate limit por usuário — impede que uma conta comprometida ou
  //    um script abusivo esgote a cota (paga) da API da Anthropic.
  const { data: permitido, error: rlError } = await supabase
    .schema("JOVI")
    .rpc(
    "checar_rate_limit_ocr",
    {
      p_auth_user_id: user.id,
      p_limite: LIMITE_REQUISICOES,
      p_janela_segundos: JANELA_SEGUNDOS,
    }
  );

  if (rlError) {
    console.error("Erro ao checar rate limit de OCR:", rlError);
    return NextResponse.json(
      { error: "Não foi possível processar agora. Tente novamente." },
      { status: 500 }
    );
  }
  if (!permitido) {
    return NextResponse.json(
      { error: "Limite de requisições excedido. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  // 3) Validação básica do payload antes de gastar chamada de API
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  const { imageBase64, mediaType, prompt } = body;
  if (!imageBase64 || !mediaType || !prompt) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  if (imageBase64.length > TAMANHO_MAXIMO_BASE64) {
    return NextResponse.json({ error: "Imagem muito grande" }, { status: 413 });
  }
  if (!mediaType.startsWith("image/")) {
    return NextResponse.json({ error: "Tipo de arquivo inválido" }, { status: 400 });
  }

  // 4) Chamada real à Anthropic — chave só existe aqui, nunca no client
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Falha ao processar a imagem" }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
