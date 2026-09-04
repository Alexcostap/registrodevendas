"use client";

import { useEffect, useState } from "react";
import { User, Loader2, AlertCircle, Plane, Check } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, FixedSelect } from "../_components/ui";

type PromotorRow = {
  id: number;
  NOME_COMPLETO: string;
  SAIDA_FERIAS: string | null;
  VOLTA_FERIAS: string | null;
  FERIAS: boolean;
};

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function FeriasPage() {
  const supabase = createClient();

  const [promotores, setPromotores] = useState<PromotorRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState("");
  const [modoGestor, setModoGestor] = useState(false);
  const [supervisorId, setSupervisorId] = useState<number | null>(null);

  async function carregarPromotores(supId: number | null) {
    let query = supabase
      .schema("JOVI")
      .from("Promotores")
      .select("id, NOME_COMPLETO, SAIDA_FERIAS, VOLTA_FERIAS, FERIAS")
      .order("NOME_COMPLETO");
    if (supId !== null) query = query.eq("SUPERVISOR", supId);
    const { data } = await query;
    setPromotores((data as any) || []);
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return;

        const { data: supervisor } = await supabase
          .schema("JOVI")
          .from("Supervisores")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (supervisor) {
          const supId = (supervisor as any).id;
          setSupervisorId(supId);
          await carregarPromotores(supId);
          setCarregando(false);
          return;
        }

        const { data: promotorProprio } = await supabase
          .schema("JOVI")
          .from("Promotores")
          .select("is_gestor")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (!promotorProprio?.is_gestor) {
          setErroCarregar("Só supervisores ou gestores acessam as férias da equipe.");
          setCarregando(false);
          return;
        }

        setModoGestor(true);
        await carregarPromotores(null);
      } catch (e) {
        setErroCarregar("Não foi possível carregar os dados. Recarregue a página.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // ---- formulário ----
  const [promotorNome, setPromotorNome] = useState("");
  const [promotorId, setPromotorId] = useState<number | null>(null);
  const [saida, setSaida] = useState("");
  const [volta, setVolta] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  const podeSalvar = !!promotorId && !!saida && !!volta && volta >= saida;

  async function handleAdicionar() {
    setErroSalvar("");
    if (!podeSalvar || !promotorId) return;
    setSalvando(true);
    const { error } = await supabase
      .schema("JOVI")
      .from("Promotores")
      .update({ SAIDA_FERIAS: saida, VOLTA_FERIAS: volta })
      .eq("id", promotorId);
    setSalvando(false);
    if (error) {
      setErroSalvar("Não foi possível salvar. Confira os dados e tente de novo.");
      return;
    }
    setPromotorNome(""); setPromotorId(null); setSaida(""); setVolta("");
    await carregarPromotores(modoGestor ? null : supervisorId);
  }

  if (carregando) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20 text-[#6B7699] gap-2">
          <Loader2 size={18} className="animate-spin" /> Carregando…
        </div>
      </Shell>
    );
  }

  if (erroCarregar) {
    return (
      <Shell>
        <Header title="Férias da equipe" backHref="/" />
        <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{erroCarregar}</div>
      </Shell>
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const deFeriasAgora = promotores.filter((p) => p.FERIAS);
  const proximasFerias = promotores.filter((p) => !p.FERIAS && p.SAIDA_FERIAS && p.SAIDA_FERIAS > hoje);

  return (
    <Shell>
      <Header title={modoGestor ? "Férias (todos os promotores)" : "Férias da equipe"} backHref="/" />

      <div className="rounded-lg border border-[#DCE1F5] bg-white p-5 mb-5 space-y-3">
        <div className="fonte-titulo text-sm font-bold text-[#0B1440] mb-1">Registrar férias</div>

        <FixedSelect
          value={promotorNome}
          onChange={(v) => { setPromotorNome(v); setPromotorId(promotores.find((p) => p.NOME_COMPLETO === v)?.id ?? null); }}
          options={promotores.map((p) => p.NOME_COMPLETO)}
          placeholder="Promotor"
          icon={User}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Saída de férias *</label>
            <input type="date" value={saida} onChange={(e) => setSaida(e.target.value)} className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Retorno *</label>
            <input type="date" value={volta} onChange={(e) => setVolta(e.target.value)} min={saida || undefined} className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]" />
          </div>
        </div>

        {saida && volta && volta < saida && (
          <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />A data de retorno precisa ser igual ou depois da saída.</div>
        )}
        {erroSalvar && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroSalvar}</div>}

        <button disabled={!podeSalvar || salvando} onClick={handleAdicionar} className="w-full rounded-md py-2.5 text-sm font-semibold flex items-center justify-center gap-2 text-white" style={{ background: podeSalvar ? "#1E46E6" : "#DCE1F5" }}>
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Salvar
        </button>
      </div>

      <div className="fonte-titulo text-sm font-bold text-[#0B1440] mb-3">De férias agora</div>
      {deFeriasAgora.length === 0 && <p className="text-sm text-[#6B7699] mb-5">Ninguém de férias no momento.</p>}
      <div className="space-y-2 mb-5">
        {deFeriasAgora.map((p) => (
          <div key={p.id} className="rounded-lg border p-4 flex items-start gap-3" style={{ borderColor: "#1F8A70", background: "#F0FBF7" }}>
            <Plane size={18} className="text-[#1F8A70] mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#0B1440]">{p.NOME_COMPLETO}</div>
              <div className="fonte-mono text-xs text-[#1F8A70]">{formatarData(p.SAIDA_FERIAS!)} – {formatarData(p.VOLTA_FERIAS!)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="fonte-titulo text-sm font-bold text-[#0B1440] mb-3">Próximas férias</div>
      {proximasFerias.length === 0 && <p className="text-sm text-[#6B7699]">Nenhuma férias futura cadastrada.</p>}
      <div className="space-y-2">
        {proximasFerias.map((p) => (
          <div key={p.id} className="rounded-lg border border-[#DCE1F5] bg-white p-4 flex items-start gap-3">
            <Plane size={18} className="text-[#1E46E6] mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#0B1440]">{p.NOME_COMPLETO}</div>
              <div className="fonte-mono text-xs text-[#1E46E6]">{formatarData(p.SAIDA_FERIAS!)} – {formatarData(p.VOLTA_FERIAS!)}</div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
