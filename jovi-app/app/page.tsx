import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HomeClient from "./home-client";

export default async function HomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca o cadastro do promotor vinculado a este usuário logado.
  // A RLS já garante que só vem a linha do próprio usuário.
  const { data: promotor } = await supabase
    .schema("JOVI")
    .from("Promotores")
    .select("NOME_COMPLETO, REGIONAL")
    .eq("auth_user_id", user!.id)
    .single();

  return <HomeClient nome={promotor?.NOME_COMPLETO ?? user!.email ?? "Promotor"} />;
}
