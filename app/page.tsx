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
    .select("NOME_COMPLETO")
    .eq("auth_user_id", user!.id)
    .maybeSingle();

  let nomeCompleto = promotor?.NOME_COMPLETO;

  if (!nomeCompleto) {
    const { data: supervisor } = await supabase
      .schema("JOVI")
      .from("Supervisores")
      .select("NOME_COMPLETO")
      .eq("auth_user_id", user!.id)
      .maybeSingle();
    nomeCompleto = supervisor?.NOME_COMPLETO;
  }

  const nomeExibido = nomeCompleto ? primeiroNomeCapitalizado(nomeCompleto) : "Promotor";

  return <HomeClient nome={nomeExibido} />;
}
