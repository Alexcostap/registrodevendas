import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";

export default async function VendaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#F4F6FC]">
      <div className="text-center max-w-sm">
        <h1 className="text-lg font-bold text-[#0B1440] mb-2">Registro de venda</h1>
        <p className="text-sm text-[#6B7699]">
          Login validado ✅ — o formulário completo (localização, OCR, identificação do vendedor)
          entra aqui na próxima etapa, já ligado às tabelas reais do Supabase.
        </p>
        <a href="/" className="text-sm text-[#1E46E6] font-semibold mt-4 inline-block">
          ← voltar
        </a>
      </div>
    </div>
  );
}
