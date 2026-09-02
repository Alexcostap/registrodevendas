"use client";

import { useEffect, useState } from "react";
import { Store, MapPin, Building2, User, Loader2, AlertCircle, Trash2, Plus } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, FixedSelect } from "../_components/ui";

type LojaRow = { id: number; CUSTOMER: string; UF: string; CIDADE: string; LOJA: string };
type PromotorRow = { id: number; NOME_COMPLETO: string };
type EscalaRow = {
  id: number;
  promotor_id: number;
  loja_id: number;
  dia: string;
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

  const [modoGestor, setModoGestor] = useState(false);

  async function carregarEscalas(supId: number | null) {
    let query = supabase
      .schema("JOVI")
      .from("Escala")
      .select("id, promotor_id, loja_id, dia, dia_semana, horario_inicio, horario_fim")
      .order("dia", { ascending: true });
    if (supId !== null) query = query.eq("supervisor_id", supId);
    const { data } = await query;
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

        if (supervisor) {
          // fluxo normal: supervisor só vê a própria equipe
          const supId = (supervisor as any).id;
          setSupervisorId(supId);

          const [promotoresRes, lojasRes] = await Promise.all([
            supabase.schema("JOVI").from("Promotores").select("id, NOME_COMPLETO").eq("SUPERVISOR", supId),
            supabase.schema("JOVI").from("Lojas").select("id:ID, CUSTOMER, UF, CIDADE, LOJA"),
          ]);
          setPromotores((promotoresRes.data as any) || []);
          setLojas((lojasRes.data as any) || []);
          await carregarEscalas(supId);
          setCarregando(false);
          return;
        }

        // não é supervisor — confere se é gestor (acesso total)
        const { data: promotorProprio } = await supabase
          .schema("JOVI")
          .from("Promotores")
          .select("is_gestor")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (!promotorProprio?.is_gestor) {
          setErroCarregar("Só supervisores ou gestores acessam a escala da equipe.");
          setCarregando(false);
          return;
        }

        setModoGestor(true);
        const [promotoresRes, lojasRes] = await Promise.all([
          supabase.schema("JOVI").from("Promotores").select("id, NOME_COMPLETO").order("NOME_COMPLETO"),
          supabase.schema("JOVI").from("Lojas").select("id:ID, CUSTOMER, UF, CIDADE, LOJA"),
        ]);
        setPromotores((promotoresRes.data as any) || []);
        setLojas((lojasRes.data as any) || []);
        await carregarEscalas(null); // gestor vê TODAS as escalas
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
  const [dataFimRecorrencia, setDataFimRecorrencia] = useState("");
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
    (modo === "pontual" ? !!dia : diasSemanaSelecionados.length > 0 && !!dataFimRecorrencia);

  function limparFormulario() {
    setPromotorNome(""); setPromotorId(null);
    setRede(""); setUf(""); setCidade(""); setLojaNome(""); setLojaId(null);
    setDia(""); setDiasSemanaSelecionados([]); setDataFimRecorrencia("");
    setHorarioInicio(""); setHorarioFim("");
  }

  // Gera uma data real para cada ocorrência de cada dia da semana
  // escolhido, entre hoje e a data final (inclusive).
  function gerarOcorrencias(diasSemana: number[], dataFimStr: string): { dia: string; dia_semana: number }[] {
    const ocorrencias: { dia: string; dia_semana: number }[] = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fim = new Date(dataFimStr + "T00:00:00");
    const cursor = new Date(hoje);
    while (cursor <= fim) {
      const diaSemanaJS = cursor.getDay(); // 0=domingo ... 6=sábado (1=segunda bate com nosso padrão)
      if (diasSemana.includes(diaSemanaJS)) {
        ocorrencias.push({ dia: cursor.toISOString().slice(0, 10), dia_semana: diaSemanaJS });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return ocorrencias;
  }

  async function handleAdicionar() {
    setErroSalvar("");
    if ((!supervisorId && !modoGestor) || !podeSalvar) return;

    if (modo === "recorrente") {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const fim = new Date(dataFimRecorrencia + "T00:00:00");
      const diasDeIntervalo = (fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
      if (diasDeIntervalo < 0) {
        setErroSalvar("A data final precisa ser hoje ou uma data futura.");
        return;
      }
      if (diasDeIntervalo > 180) {
        setErroSalvar("Escolha uma data final de até 180 dias à frente.");
        return;
      }
    }

    setSalvando(true);

    const base = {
      supervisor_id: supervisorId, // null no modo gestor — coluna aceita null
      promotor_id: promotorId,
      loja_id: lojaId,
      horario_inicio: horarioInicio || null,
      horario_fim: horarioFim || null,
    };

    const linhas: { supervisor_id: number | null; promotor_id: number; loja_id: number; horario_inicio: string | null; horario_fim: string | null; dia: string; dia_semana: number | null }[] =
      modo === "pontual"
        ? [{ ...base, dia, dia_semana: null }]
        : gerarOcorrencias(diasSemanaSelecionados, dataFimRecorrencia).map((o) => ({ ...base, dia: o.dia, dia_semana: o.dia_semana }));

    if (modo === "recorrente" && linhas.length === 0) {
      setSalvando(false);
      setErroSalvar("Nenhuma data cai nos dias escolhidos até a data final. Confira a seleção.");
      return;
    }

    const { error } = await supabase.schema("JOVI").from("Escala").insert(linhas);
    setSalvando(false);
    if (error) {
      setErroSalvar("Não foi possível salvar. Confira os dados e tente de novo.");
      return;
    }
    limparFormulario();
    await carregarEscalas(modoGestor ? null : supervisorId);
  }

  async function handleRemover(id: number) {
    if (!supervisorId && !modoGestor) return;
    await supabase.schema("JOVI").from("Escala").delete().eq("id", id);
    await carregarEscalas(modoGestor ? null : supervisorId);
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
    const [ano, mes, diaNum] = e.dia.split("-");
    const dataFormatada = `${diaNum}/${mes}/${ano}`;
    if (e.dia_semana !== null) {
      const nome = DIAS_SEMANA.find((d) => d.valor === e.dia_semana)?.curto || "";
      return `${dataFormatada} (${nome}, recorrente)${horarios}`;
    }
    return `${dataFormatada}${horarios}`;
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
      <Header title={modoGestor ? "Escala (todos os promotores)" : "Escala da equipe"} backHref="/" />

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

        <FixedSelect value={rede} onChange={(v) => { setRede(v); setUf(""); setCidade(""); selecionarLoja(""); }} options={redesDisponiveis} placeholder="Rede" icon={Building2} required />
        {rede && <FixedSelect value={uf} onChange={(v) => { setUf(v); setCidade(""); selecionarLoja(""); }} options={ufsDisponiveis} placeholder="UF" icon={MapPin} required />}
        {rede && uf && <FixedSelect value={cidade} onChange={(v) => { setCidade(v); selecionarLoja(""); }} options={cidadesDisponiveis} placeholder="Cidade" icon={MapPin} required />}
        {rede && uf && cidade && <FixedSelect value={lojaNome} onChange={selecionarLoja} options={lojasDisponiveis} placeholder="Loja" icon={Store} required />}

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
          <div className="space-y-3">
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
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Repetir até (data final) *</label>
              <input
                type="date"
                value={dataFimRecorrencia}
                onChange={(e) => setDataFimRecorrencia(e.target.value)}
                className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]"
              />
              <p className="text-[10px] text-[#6B7699] mt-1">Uma linha será criada para cada data real entre hoje e essa data, nos dias marcados acima.</p>
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
