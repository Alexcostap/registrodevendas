"use client";

import { useEffect, useState } from "react";
import { Store, MapPin, Building2, User, Loader2, AlertCircle, Trash2, Plus } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, TypeableSelect, FixedSelect } from "../_components/ui";

type LojaRow = { id: number; CUSTOMER: string; UF: string; CIDADE: string; LOJA: string };
type PromotorRow = { id: number; NOME_COMPLETO: string };
type EscalaRow = {
  id: number;
  promotor_id: number;
  loja_id: number;
  dia: string | null;
  dia_semana: number | null;
  horario_inicio: string | null;
  horario_fim: string | null;
};

const DIAS_SEMANA = [
  { valor: 1, curto: "Segunda", longo: "Segunda-feira" },
  { valor: 2, curto: "Terça", longo: "Terça-feira" },
  { valor: 3, curto: "Quarta", longo: "Quarta-feira" },
  { valor: 4, curto: "Quinta", longo: "Quinta-feira" },
  { valor: 5, curto: "Sexta", longo: "Sexta-feira" },
  { valor: 6, curto: "Sábado", longo: "Sábado" },
];

export default function EscalaPage() {
  const supabase = createClient();

  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  const [promotores, setPromotores] = useState<PromotorRow[]>([]);
  const [lojas, setLojas] = useState<LojaRow[]>([]);
  const [escalas, setEscalas] = useState<EscalaRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState("");

  async function carregarEscalas(supId: number) {
    const { data } = await supabase
      .schema("JOVI")
      .from("Escala")
      .select("id, promotor_id, loja_id, dia, dia_semana, horario_inicio, horario_fim")
      .eq("supervisor_id", supId)
      .order("dia", { ascending: true });
    setEscalas((data as any) || []);
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

        if (!supervisor) {
          setErroCarregar("Só supervisores acessam a escala da equipe.");
          setCarregando(false);
          return;
        }
        const supId = (supervisor as any).id;
        setSupervisorId(supId);

        const [promotoresRes, lojasRes] = await Promise.all([
          supabase.schema("JOVI").from("Promotores").select("id, NOME_COMPLETO").eq("SUPERVISOR", supId),
          supabase.schema("JOVI").from("Lojas").select("id:ID, CUSTOMER, UF, CIDADE, LOJA"),
        ]);
        setPromotores((promotoresRes.data as any) || []);
        setLojas((lojasRes.data as any) || []);
        await carregarEscalas(supId);
      } catch (e) {
        setErroCarregar("Não foi possível carregar os dados. Recarregue a página.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // ---- formulário de novo apontamento ----
  const [modo, setModo] = useState<"pontual" | "recorrente">("pontual");
  const [promotorNome, setPromotorNome] = useState("");
  const [promotorId, setPromotorId] = useState<number | null>(null);
  const [rede, setRede] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [lojaNome, setLojaNome] = useState("");
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [dia, setDia] = useState("");
  const [diasSemanaSelecionados, setDiasSemanaSelecionados] = useState<number[]>([]);
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFim, setHorarioFim] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  const redesDisponiveis = [...new Set(lojas.map((l) => l.CUSTOMER))];
  const ufsDisponiveis = rede ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede).map((l) => l.UF))] : [];
  const cidadesDisponiveis = rede && uf ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf).map((l) => l.CIDADE))] : [];
  const lojasDisponiveis = rede && uf && cidade ? lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade).map((l) => l.LOJA) : [];

  function selecionarLoja(nome: string) {
    setLojaNome(nome);
    const encontrada = lojas.find((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade && l.LOJA === nome);
    setLojaId(encontrada ? encontrada.id : null);
  }

  function alternarDiaSemana(valor: number) {
    setDiasSemanaSelecionados((prev) =>
      prev.includes(valor) ? prev.filter((d) => d !== valor) : [...prev, valor]
    );
  }

  const podeSalvar =
    !!promotorId &&
    !!lojaId &&
    (modo === "pontual" ? !!dia : diasSemanaSelecionados.length > 0);

  function limparFormulario() {
    setPromotorNome(""); setPromotorId(null);
    setRede(""); setUf(""); setCidade(""); setLojaNome(""); setLojaId(null);
    setDia(""); setDiasSemanaSelecionados([]);
    setHorarioInicio(""); setHorarioFim("");
  }

  async function handleAdicionar() {
    setErroSalvar("");
    if (!supervisorId || !podeSalvar) return;
    setSalvando(true);

    const base = {
      supervisor_id: supervisorId,
      promotor_id: promotorId,
      loja_id: lojaId,
      horario_inicio: horarioInicio || null,
      horario_fim: horarioFim || null,
    };

    const linhas: { supervisor_id: number; promotor_id: number; loja_id: number; horario_inicio: string | null; horario_fim: string | null; dia: string | null; dia_semana: number | null }[] =
      modo === "pontual"
        ? [{ ...base, dia, dia_semana: null }]
        : diasSemanaSelecionados.map((d) => ({ ...base, dia: null, dia_semana: d }));

    const { error } = await supabase.schema("JOVI").from("Escala").insert(linhas);
    setSalvando(false);
    if (error) {
      setErroSalvar("Não foi possível salvar. Confira os dados e tente de novo.");
      return;
    }
    limparFormulario();
    await carregarEscalas(supervisorId);
  }

  async function handleRemover(id: number) {
    if (!supervisorId) return;
    await supabase.schema("JOVI").from("Escala").delete().eq("id", id);
    await carregarEscalas(supervisorId);
  }

  function nomePromotor(id: number) {
    return promotores.find((p) => p.id === id)?.NOME_COMPLETO || "—";
  }

  function nomeLoja(id: number) {
    const l = lojas.find((l) => l.id === id);
    return l ? `${l.CIDADE} — ${l.LOJA}` : "—";
  }

  function formatarQuando(e: EscalaRow) {
    const horarios = e.horario_inicio ? ` · ${e.horario_inicio.slice(0, 5)}${e.horario_fim ? "–" + e.horario_fim.slice(0, 5) : ""}` : "";
    if (e.dia_semana) {
      const nome = DIAS_SEMANA.find((d) => d.valor === e.dia_semana)?.longo || "";
      return `Toda ${nome}${horarios}`;
    }
    if (e.dia) {
      const [ano, mes, diaNum] = e.dia.split("-");
      return `${diaNum}/${mes}/${ano}${horarios}`;
    }
    return "—";
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
        <Header title="Escala da equipe" backHref="/" />
        <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{erroCarregar}</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Header title="Escala da equipe" backHref="/" />

      <div className="rounded-lg border border-[#DCE1F5] bg-white p-5 mb-5 space-y-3">
        <div className="fonte-titulo text-sm font-bold text-[#0B1440] mb-1">Novo apontamento</div>

        <div className="flex gap-2">
          <button
            onClick={() => setModo("pontual")}
            className="flex-1 rounded-md py-2 text-sm font-semibold border"
            style={{ background: modo === "pontual" ? "#1E46E6" : "#FFFFFF", color: modo === "pontual" ? "#FFFFFF" : "#0B1440", borderColor: "#DCE1F5" }}
          >
            Data específica
          </button>
          <button
            onClick={() => setModo("recorrente")}
            className="flex-1 rounded-md py-2 text-sm font-semibold border"
            style={{ background: modo === "recorrente" ? "#1E46E6" : "#FFFFFF", color: modo === "recorrente" ? "#FFFFFF" : "#0B1440", borderColor: "#DCE1F5" }}
          >
            Recorrente
          </button>
        </div>

        <FixedSelect
          value={promotorNome}
          onChange={(v) => { setPromotorNome(v); setPromotorId(promotores.find((p) => p.NOME_COMPLETO === v)?.id ?? null); }}
          options={promotores.map((p) => p.NOME_COMPLETO)}
          placeholder="Promotor"
          icon={User}
          required
        />

        <TypeableSelect listId="lista-redes-escala" value={rede} onChange={(v) => { setRede(v); setUf(""); setCidade(""); selecionarLoja(""); }} options={redesDisponiveis} placeholder="Rede" icon={Building2} />
        {rede && <TypeableSelect listId="lista-ufs-escala" value={uf} onChange={(v) => { setUf(v); setCidade(""); selecionarLoja(""); }} options={ufsDisponiveis} placeholder="UF" icon={MapPin} />}
        {rede && uf && <TypeableSelect listId="lista-cidades-escala" value={cidade} onChange={(v) => { setCidade(v); selecionarLoja(""); }} options={cidadesDisponiveis} placeholder="Cidade" icon={MapPin} />}
        {rede && uf && cidade && <TypeableSelect listId="lista-lojas-escala" value={lojaNome} onChange={selecionarLoja} options={lojasDisponiveis} placeholder="Loja" icon={Store} />}

        {modo === "pontual" ? (
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Dia *</label>
            <input
              type="date"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold mb-2 text-[#0B1440]">Toda:</label>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((d) => {
                const selecionado = diasSemanaSelecionados.includes(d.valor);
                return (
                  <button
                    key={d.valor}
                    onClick={() => alternarDiaSemana(d.valor)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                    style={{
                      background: selecionado ? "#1E46E6" : "#FFFFFF",
                      color: selecionado ? "#FFFFFF" : "#0B1440",
                      borderColor: selecionado ? "#1E46E6" : "#DCE1F5",
                    }}
                  >
                    {d.curto}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Hora de entrada</label>
            <input type="time" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Hora de saída</label>
            <input type="time" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]" />
          </div>
        </div>

        {erroSalvar && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroSalvar}</div>}

        <button disabled={!podeSalvar || salvando} onClick={handleAdicionar} className="w-full rounded-md py-2.5 text-sm font-semibold flex items-center justify-center gap-2 text-white" style={{ background: podeSalvar ? "#1E46E6" : "#DCE1F5" }}>
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Adicionar à escala
        </button>
      </div>

      <div className="fonte-titulo text-sm font-bold text-[#0B1440] mb-3">Apontamentos cadastrados</div>
      {escalas.length === 0 && <p className="text-sm text-[#6B7699]">Nenhum apontamento cadastrado ainda.</p>}
      <div className="space-y-2">
        {escalas.map((e) => (
          <div key={e.id} className="rounded-lg border border-[#DCE1F5] bg-white p-4 flex items-start justify-between gap-3">
            <div>
              <div className="fonte-mono text-xs font-bold text-[#1E46E6] mb-1">{formatarQuando(e)}</div>
              <div className="text-sm font-semibold text-[#0B1440]">{nomePromotor(e.promotor_id)}</div>
              <div className="text-xs text-[#6B7699]">{nomeLoja(e.loja_id)}</div>
            </div>
            <button onClick={() => handleRemover(e.id)} className="text-[#6B7699]" aria-label="Remover">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </Shell>
  );
}
