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
    .select("id, NOME_COMPLETO")
    .eq("auth_user_id", user!.id)
    .maybeSingle();

  let nomeCompleto = promotor?.NOME_COMPLETO;
  const ehPromotor = !!promotor;
  let ehSupervisor = false;

  if (!nomeCompleto) {
    const { data: supervisor } = await supabase
      .schema("JOVI")
      .from("Supervisores")
      .select("NOME_COMPLETO")
      .eq("auth_user_id", user!.id)
      .maybeSingle();
    nomeCompleto = supervisor?.NOME_COMPLETO;
    ehSupervisor = !!supervisor;
  }

  const nomeExibido = nomeCompleto ? primeiroNomeCapitalizado(nomeCompleto) : "Promotor";

  // Só promotores registram ponto — e só checamos se tem turno aberto
  // quando a pessoa É promotor, pra não gastar consulta à toa.
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
  }

  return (
    <HomeClient
      nome={nomeExibido}
      ehPromotor={ehPromotor}
      ehSupervisor={ehSupervisor}
      turnoAberto={turnoAberto}
    />
  );
}
