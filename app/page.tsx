import { createClient } from "../lib/supabase/server";
import { redirect } from "next/navigation";
import HomeClient from "./home-client";
import { primeiroNomeCapitalizado } from "../lib/mascaras";

export default async function HomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca o cadastro vinculado a este usuário logado — pode ser
  // Promotor ou Supervisor, já que os dois logam pelo mesmo app.
  // A RLS já garante que só vem a linha do próprio usuário.
  const { data: promotor } = await supabase
    .schema("JOVI")
    .from("Promotores")
    .select("id, NOME_COMPLETO, is_gestor")
    .eq("auth_user_id", user!.id)
    .maybeSingle();

  let nomeCompleto = promotor?.NOME_COMPLETO;
  const ehPromotor = !!promotor;
  const ehGestor = !!promotor?.is_gestor;
  let ehSupervisor = false;
  let supervisorId: number | null = null;

  if (!nomeCompleto) {
    const { data: supervisor } = await supabase
      .schema("JOVI")
      .from("Supervisores")
      .select("id, NOME_COMPLETO")
      .eq("auth_user_id", user!.id)
      .maybeSingle();
    nomeCompleto = supervisor?.NOME_COMPLETO;
    ehSupervisor = !!supervisor;
    supervisorId = supervisor?.id ?? null;
  }

  const nomeExibido = nomeCompleto ? primeiroNomeCapitalizado(nomeCompleto) : "Promotor";

  // Promotores e supervisores registram ponto, cada um na própria
  // tabela — só checamos a que for relevante pra pessoa logada.
  let turnoAberto = null;
  if (promotor) {
    const { data } = await supabase
      .schema("JOVI")
      .from("Ponto")
      .select("id, data_hora_entrada, loja_id")
      .eq("promotor_id", promotor.id)
      .is("data_hora_saida", null)
      .maybeSingle();
    turnoAberto = data;
  } else if (supervisorId) {
    const { data } = await supabase
      .schema("JOVI")
      .from("Ponto_Supervisor")
      .select("id, data_hora_entrada, loja_id")
      .eq("supervisor_id", supervisorId)
      .is("data_hora_saida", null)
      .maybeSingle();
    turnoAberto = data;
  }

  return (
    <HomeClient
      nome={nomeExibido}
      ehPromotor={ehPromotor}
      ehSupervisor={ehSupervisor}
      ehGestor={ehGestor}
      turnoAberto={turnoAberto}
    />
  );
}
