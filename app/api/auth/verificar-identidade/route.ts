// app/api/auth/verificar-identidade/route.ts
//
// Recebe CPF + data de nascimento, confere contra Promotores/Supervisores,
// e se bater, autentica a pessoa (sem precisar de senha ainda) — usado
// tanto no "primeiro acesso" quanto em "esqueci minha senha", já que os
// dois casos são a mesma pergunta: "essa pessoa é quem diz ser?".
//
// Roda inteiramente no servidor com o cliente admin (service_role).
// O service_role NUNCA é exposto ao navegador — só existe aqui dentro.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient, createClient } from "../../../../lib/supabase/server";

const LIMITE_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

function somenteDigitos(v: string) {
  return (v || "").replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

    const cpf = somenteDigitos(body.cpf);
    const nascimento = somenteDigitos(body.nascimento); // DDMMAAAA

    if (cpf.length !== 11 || nascimento.length !== 8) {
      return NextResponse.json({ error: "CPF ou data de nascimento incompletos." }, { status: 400 });
    }

    const admin = createAdminClient();

    // ---- Rate limit por CPF ----
    const { data: limite } = await admin
      .schema("JOVI")
      .from("identidade_rate_limit")
      .select("*")
      .eq("cpf", cpf)
      .maybeSingle();

    const agora = new Date();
    if (limite?.bloqueado_ate && new Date(limite.bloqueado_ate) > agora) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    // ---- Busca em Promotores, depois Supervisores ----
    const dataISO = `${nascimento.slice(4, 8)}-${nascimento.slice(2, 4)}-${nascimento.slice(0, 2)}`;

    const buscar = async (tabela: "Promotores" | "Supervisores") => {
      const { data, error } = await admin
        .schema("JOVI")
        .from(tabela)
        .select("id, NOME_COMPLETO, CPF, DTA_NASCIMENTO, auth_user_id")
        .filter("CPF", "not.is", null);
      if (error) throw new Error(`Falha ao consultar ${tabela}: ${error.message}`);
      return (data || []).find((linha: any) => somenteDigitos(linha.CPF) === cpf);
    };

    let tabela: "Promotores" | "Supervisores" = "Promotores";
    let pessoa = await buscar("Promotores");
    if (!pessoa) {
      tabela = "Supervisores";
      pessoa = await buscar("Supervisores");
    }

    const nascimentoConfere =
      pessoa && pessoa.DTA_NASCIMENTO && pessoa.DTA_NASCIMENTO === dataISO;

    if (!pessoa || !nascimentoConfere) {
      // registra tentativa falha
      const tentativas = (limite?.tentativas || 0) + 1;
      const bloqueado_ate =
        tentativas >= LIMITE_TENTATIVAS
          ? new Date(agora.getTime() + BLOQUEIO_MINUTOS * 60 * 1000).toISOString()
          : null;
      await admin
        .schema("JOVI")
        .from("identidade_rate_limit")
        .upsert({ cpf, tentativas, janela_inicio: agora.toISOString(), bloqueado_ate });

      return NextResponse.json(
        { error: "CPF ou data de nascimento não conferem." },
        { status: 401 }
      );
    }

    // sucesso: zera o rate limit
    await admin
      .schema("JOVI")
      .from("identidade_rate_limit")
      .upsert({ cpf, tentativas: 0, janela_inicio: agora.toISOString(), bloqueado_ate: null });

    const emailSintetico = `cpf${cpf}@jovi.internal`;
    let authUserId = pessoa.auth_user_id as string | null;

    if (!authUserId) {
      // primeiro acesso de verdade: cria o usuário no Supabase Auth
      const { data: novoUsuario, error: erroCriacao } = await admin.auth.admin.createUser({
        email: emailSintetico,
        email_confirm: true,
        password: randomUUID(), // senha aleatória, nunca usada — o PIN é definido no próximo passo
      });
      if (erroCriacao || !novoUsuario?.user) {
        console.error("Erro ao criar usuário:", erroCriacao);
        return NextResponse.json({ error: "Não foi possível criar o acesso." }, { status: 500 });
      }
      authUserId = novoUsuario.user.id;
      await admin
        .schema("JOVI")
        .from(tabela)
        .update({ auth_user_id: authUserId })
        .eq("id", pessoa.id);
    } else {
      // já existe uma conta vinculada (pode ser de um fluxo antigo, com
      // outro e-mail) — garante que o e-mail bate com o padrão CPF, senão
      // o generateLink abaixo cria uma conta NOVA e órfã em vez de
      // reaproveitar esta, e a pessoa fica com duas contas duplicadas.
      const { error: erroAtualizarEmail } = await admin.auth.admin.updateUserById(authUserId, {
        email: emailSintetico,
        email_confirm: true,
      });
      if (erroAtualizarEmail) {
        console.error("Erro ao migrar e-mail da conta existente:", erroAtualizarEmail);
      }
    }

    // Gera um link de acesso e troca por uma sessão real — a pessoa fica
    // logada sem nunca precisar saber a senha aleatória gerada acima.
    const { data: linkData, error: erroLink } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: emailSintetico,
    });
    if (erroLink || !linkData?.properties?.hashed_token) {
      console.error("Erro ao gerar link:", erroLink);
      return NextResponse.json({ error: "Não foi possível autenticar." }, { status: 500 });
    }

    const supabase = createClient();
    const { error: erroVerify } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: linkData.properties.hashed_token,
    });
    if (erroVerify) {
      console.error("Erro ao verificar OTP:", erroVerify);
      return NextResponse.json({ error: "Não foi possível autenticar." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, nome: pessoa.NOME_COMPLETO });
  } catch (err: any) {
    console.error("Erro inesperado em verificar-identidade:", err);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
