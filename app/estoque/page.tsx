"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Store, MapPin, Building2, Smartphone, Palette, Minus, Plus, Check, Loader2, AlertCircle, PlusCircle, X, Users, Clock3 } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, TypeableSelect, FixedSelect } from "../_components/ui";

type LojaRow = { id: number; CUSTOMER: string; UF: string; CIDADE: string; LOJA: string };
type ModeloRow = { id: number; MODELO: string };
type CorRow = { id: number; COR: string; COR_BR: string };
type PromotorEquipe = { id: number; NOME_COMPLETO: string; auth_user_id: string | null };
type ResumoLojaEquipe = { lojaId: number; nomeLoja: string; totalEstoque: number; nomePromotor: string; ultimaAtualizacao: string };

type ItemEstoque = {
  modeloNome: string;
  modeloId: number | null;
  corNome: string;
  corId: number | null;
  qtd: number;
  carregandoQtd: boolean;
};

function itemVazio(): ItemEstoque {
  return { modeloNome: "", modeloId: null, corNome: "", corId: null, qtd: 0, carregandoQtd: false };
}

function EstoqueConteudo() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const lojaViaUrl = searchParams.get("loja");

  const [lojas, setLojas] = useState<LojaRow[]>([]);
  const [modelos, setModelos] = useState<ModeloRow[]>([]);
  const [cores, setCores] = useState<CorRow[]>([]);
  const [carregandoReferencia, setCarregandoReferencia] = useState(true);
  const [erroReferencia, setErroReferencia] = useState("");

  // ---- papel: supervisor/gestor têm uma aba extra de visão da equipe ----
  const [ehSupervisor, setEhSupervisor] = useState(false);
  const [ehGestor, setEhGestor] = useState(false);
  const [equipe, setEquipe] = useState<PromotorEquipe[]>([]);
  const [aba, setAba] = useState<"registrar" | "equipe">("registrar");
  const [resumoEquipe, setResumoEquipe] = useState<ResumoLojaEquipe[]>([]);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [erroResumo, setErroResumo] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [lojasRes, modelosRes, coresRes] = await Promise.all([
          supabase.schema("JOVI").from("Lojas").select('id:ID, CUSTOMER, UF, CIDADE, LOJA'),
          supabase.schema("JOVI").from("Modelos").select("id, MODELO").eq("EM_VENDA", true),
          supabase.schema("JOVI").from("Cores").select("id, COR, COR_BR"),
        ]);
        setLojas((lojasRes.data as any) || []);
        setModelos((modelosRes.data as any) || []);
        setCores((coresRes.data as any) || []);

        if (lojaViaUrl) {
          const encontrada = ((lojasRes.data as any) || []).find((l: LojaRow) => l.LOJA === lojaViaUrl);
          if (encontrada) {
            setRede(encontrada.CUSTOMER);
            setUf(encontrada.UF);
            setCidade(encontrada.CIDADE);
            setLojaNome(encontrada.LOJA);
            setLojaId(encontrada.id);
            setEtapa("form");
          }
        }

        // detecta se é supervisor (equipe própria) ou gestor (todo mundo)
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (uid) {
          const { data: supervisor } = await supabase
            .schema("JOVI")
            .from("Supervisores")
            .select("id")
            .eq("auth_user_id", uid)
            .maybeSingle();

          if (supervisor) {
            setEhSupervisor(true);
            const { data: equipeRes } = await supabase
              .schema("JOVI")
              .from("Promotores")
              .select("id, NOME_COMPLETO, auth_user_id");
            setEquipe((equipeRes as any) || []);
          } else {
            const { data: promotorProprio } = await supabase
              .schema("JOVI")
              .from("Promotores")
              .select("is_gestor")
              .eq("auth_user_id", uid)
              .maybeSingle();
            if (promotorProprio?.is_gestor) {
              setEhGestor(true);
              const { data: equipeRes } = await supabase
                .schema("JOVI")
                .from("Promotores")
                .select("id, NOME_COMPLETO, auth_user_id");
              setEquipe((equipeRes as any) || []);
            }
          }
        }
      } catch (e) {
        setErroReferencia("Não foi possível carregar os dados. Recarregue a página.");
      } finally {
        setCarregandoReferencia(false);
      }
    })();
  }, []);

  const [rede, setRede] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [lojaNome, setLojaNome] = useState("");
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [etapa, setEtapa] = useState<"loja" | "form" | "sucesso">("loja");

  const redesDisponiveis = [...new Set(lojas.map((l) => l.CUSTOMER))];
  const ufsDisponiveis = rede ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede).map((l) => l.UF))] : [];
  const cidadesDisponiveis = rede && uf ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf).map((l) => l.CIDADE))] : [];
  const lojasDisponiveis = rede && uf && cidade ? lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade).map((l) => l.LOJA) : [];

  async function carregarResumoEquipe() {
    setCarregandoResumo(true);
    setErroResumo("");
    try {
      const authUserIds = new Set(equipe.map((p) => p.auth_user_id).filter(Boolean) as string[]);
      const { data, error } = await supabase
        .schema("JOVI")
        .from("Estoque")
        .select("loja_id, quantidade, atualizado_por, atualizado_em");
      if (error) throw error;

      const linhasDaEquipe = ((data as any) || []).filter(
        (r: any) => r.atualizado_por && authUserIds.has(r.atualizado_por)
      );

      const porLoja = new Map<number, { total: number; maisRecente: any }>();
      for (const linha of linhasDaEquipe) {
        const atual = porLoja.get(linha.loja_id) || { total: 0, maisRecente: linha };
        atual.total += linha.quantidade || 0;
        if (new Date(linha.atualizado_em) > new Date(atual.maisRecente.atualizado_em)) {
          atual.maisRecente = linha;
        }
        porLoja.set(linha.loja_id, atual);
      }

      const resumo: ResumoLojaEquipe[] = Array.from(porLoja.entries())
        .map(([lojaId, info]) => {
          const loja = lojas.find((l) => l.id === lojaId);
          const promotor = equipe.find((p) => p.auth_user_id === info.maisRecente.atualizado_por);
          return {
            lojaId,
            nomeLoja: loja ? `${loja.CUSTOMER} — ${loja.LOJA}` : "—",
            totalEstoque: info.total,
            nomePromotor: promotor?.NOME_COMPLETO || "—",
            ultimaAtualizacao: info.maisRecente.atualizado_em,
          };
        })
        .sort((a, b) => b.ultimaAtualizacao.localeCompare(a.ultimaAtualizacao));

      setResumoEquipe(resumo);
    } catch (e) {
      setErroResumo("Não foi possível carregar o resumo da equipe.");
    } finally {
      setCarregandoResumo(false);
    }
  }

  function abrirAbaEquipe() {
    setAba("equipe");
    if (resumoEquipe.length === 0) carregarResumoEquipe();
  }

  function formatarDataHora(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function selecionarLoja(nome: string) {
    setLojaNome(nome);
    const encontrada = lojas.find((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade && l.LOJA === nome);
    setLojaId(encontrada ? encontrada.id : null);
    if (encontrada) setEtapa("form");
  }

  // ---- lista de itens (modelo + cor + quantidade), repetível ----
  const [itens, setItens] = useState<ItemEstoque[]>([itemVazio()]);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  function atualizarItem(index: number, mudanca: Partial<ItemEstoque>) {
    setItens((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], ...mudanca };
      return copia;
    });
  }

  async function carregarQuantidadeAtual(index: number, modeloId: number, corId: number) {
    atualizarItem(index, { carregandoQtd: true });
    const { data } = await supabase
      .schema("JOVI")
      .from("Estoque")
      .select("quantidade")
      .eq("loja_id", lojaId)
      .eq("modelo_id", modeloId)
      .eq("cor_id", corId)
      .maybeSingle();
    atualizarItem(index, { qtd: (data as any)?.quantidade ?? 0, carregandoQtd: false });
  }

  function handleSelecionarModelo(index: number, nome: string) {
    const modelo = modelos.find((m) => m.MODELO === nome);
    const modeloId = modelo?.id ?? null;
    atualizarItem(index, { modeloNome: nome, modeloId });
    const corIdAtual = itens[index].corId;
    if (modeloId && corIdAtual) carregarQuantidadeAtual(index, modeloId, corIdAtual);
  }

  function handleSelecionarCor(index: number, nome: string) {
    const cor = cores.find((c) => c.COR_BR === nome);
    const corId = cor?.id ?? null;
    atualizarItem(index, { corNome: nome, corId });
    const modeloIdAtual = itens[index].modeloId;
    if (modeloIdAtual && corId) carregarQuantidadeAtual(index, modeloIdAtual, corId);
  }

  function adicionarItem() {
    setItens((prev) => [...prev, itemVazio()]);
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  const podeSalvarTodos =
    itens.length > 0 && itens.every((i) => i.modeloId && i.corId && !i.carregandoQtd);

  function temDuplicata(): boolean {
    const chaves = itens.map((i) => `${i.modeloId}-${i.corId}`);
    return new Set(chaves).size !== chaves.length;
  }

  async function handleSalvar() {
    setErroSalvar("");
    if (temDuplicata()) {
      setErroSalvar("Você escolheu o mesmo modelo + cor mais de uma vez. Remova a duplicata.");
      return;
    }
    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;

    const resultados = await Promise.all(
      itens.map((item) =>
        supabase.schema("JOVI").rpc("upsert_estoque", {
          p_loja_id: lojaId,
          p_modelo_id: item.modeloId,
          p_cor_id: item.corId,
          p_quantidade: item.qtd,
          p_atualizado_por: uid,
        })
      )
    );
    setSalvando(false);

    const algumErro = resultados.find((r) => r.error);
    if (algumErro) {
      setErroSalvar("Não foi possível salvar um ou mais itens. Tente novamente.");
      return;
    }
    setEtapa("sucesso");
  }

  function irParaOutraLoja() {
    setRede(""); setUf(""); setCidade(""); setLojaNome(""); setLojaId(null);
    setItens([itemVazio()]);
    setEtapa("loja");
  }

  function irParaMesmaLojaOutroItem() {
    setItens([itemVazio()]);
    setEtapa("form");
  }

  if (carregandoReferencia) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20 text-[#6B7699] gap-2">
          <Loader2 size={18} className="animate-spin" /> Carregando…
        </div>
      </Shell>
    );
  }

  if (erroReferencia) {
    return (
      <Shell>
        <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{erroReferencia}</div>
      </Shell>
    );
  }

  if (etapa === "loja") {
    return (
      <Shell>
        <Header title="Atualizar estoque" backHref="/" />

        {(ehSupervisor || ehGestor) && (
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setAba("registrar")}
              className="flex-1 rounded-md py-2 text-sm font-semibold border"
              style={{ background: aba === "registrar" ? "#1E46E6" : "#FFFFFF", color: aba === "registrar" ? "#FFFFFF" : "#0B1440", borderColor: "#DCE1F5" }}
            >
              Registrar
            </button>
            <button
              onClick={abrirAbaEquipe}
              className="flex-1 rounded-md py-2 text-sm font-semibold border"
              style={{ background: aba === "equipe" ? "#1E46E6" : "#FFFFFF", color: aba === "equipe" ? "#FFFFFF" : "#0B1440", borderColor: "#DCE1F5" }}
            >
              Visão da equipe
            </button>
          </div>
        )}

        {aba === "equipe" ? (
          <div>
            {carregandoResumo && (
              <div className="flex items-center justify-center py-10 text-[#6B7699] gap-2">
                <Loader2 size={18} className="animate-spin" /> Carregando…
              </div>
            )}
            {erroResumo && <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{erroResumo}</div>}
            {!carregandoResumo && !erroResumo && resumoEquipe.length === 0 && (
              <p className="text-sm text-[#6B7699]">Nenhum estoque atualizado pela equipe ainda.</p>
            )}
            <div className="space-y-2">
              {resumoEquipe.map((r) => (
                <div key={r.lojaId} className="rounded-lg border border-[#DCE1F5] bg-white p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E46E6] mb-1">
                    <Store size={12} /> {r.nomeLoja}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-[#0B1440]">
                      <Users size={14} className="text-[#6B7699]" /> {r.nomePromotor}
                    </div>
                    <div className="fonte-mono text-lg font-bold text-[#0B1440]">{r.totalEstoque} un.</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B7699] mt-1">
                    <Clock3 size={11} /> Última atualização: {formatarDataHora(r.ultimaAtualizacao)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <FixedSelect value={rede} onChange={(v) => { setRede(v); setUf(""); setCidade(""); selecionarLoja(""); }} options={redesDisponiveis} placeholder="Rede" icon={Building2} />
            {rede && <FixedSelect value={uf} onChange={(v) => { setUf(v); setCidade(""); selecionarLoja(""); }} options={ufsDisponiveis} placeholder="UF" icon={MapPin} />}
            {rede && uf && <FixedSelect value={cidade} onChange={(v) => { setCidade(v); selecionarLoja(""); }} options={cidadesDisponiveis} placeholder="Cidade" icon={MapPin} />}
            {rede && uf && cidade && <FixedSelect value={lojaNome} onChange={selecionarLoja} options={lojasDisponiveis} placeholder="Loja" icon={Store} />}
          </div>
        )}
      </Shell>
    );
  }

  if (etapa === "form") {
    return (
      <Shell>
        <Header title="Atualizar estoque" onBack={irParaOutraLoja} />
        <div className="text-xs font-semibold mb-5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF0FF] text-[#1E46E6]">
          <Store size={12} /> {lojaNome}
        </div>

        <div className="space-y-5">
          {itens.map((item, index) => (
            <div key={index} className="space-y-3 pb-5 border-b border-[#DCE1F5] last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="fonte-mono text-xs font-bold text-[#6B7699]">ITEM {index + 1}</span>
                {itens.length > 1 && (
                  <button onClick={() => removerItem(index)} className="text-[#6B7699]" aria-label="Remover item">
                    <X size={16} />
                  </button>
                )}
              </div>

              <FixedSelect value={item.modeloNome} onChange={(v) => handleSelecionarModelo(index, v)} options={modelos.map((m) => m.MODELO)} placeholder="Aparelho" icon={Smartphone} />
              <FixedSelect value={item.corNome} onChange={(v) => handleSelecionarCor(index, v)} options={cores.map((c) => c.COR_BR)} placeholder="Cor" icon={Palette} />

              <div>
                <label className="block text-xs font-semibold mb-2 text-[#0B1440]">Quantidade em estoque</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => atualizarItem(index, { qtd: Math.max(0, item.qtd - 1) })} className="w-11 h-11 rounded-full flex items-center justify-center bg-[#EAF0FF] text-[#1E46E6]">
                    <Minus size={18} />
                  </button>
                  <div className="fonte-mono flex-1 text-center text-2xl font-bold rounded-md py-2 text-[#0B1440] bg-white border border-[#DCE1F5]">
                    {item.carregandoQtd ? <Loader2 size={18} className="animate-spin inline" /> : item.qtd}
                  </div>
                  <button onClick={() => atualizarItem(index, { qtd: item.qtd + 1 })} className="w-11 h-11 rounded-full flex items-center justify-center bg-[#1E46E6] text-white">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button onClick={adicionarItem} className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2 text-[#1E46E6] border-2 border-dashed border-[#1E46E6] rounded-md">
            <PlusCircle size={16} /> Adicionar outro modelo
          </button>

          {erroSalvar && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroSalvar}</div>}

          <button disabled={!podeSalvarTodos || salvando} onClick={handleSalvar} className="w-full rounded-md py-3 text-sm font-semibold mt-2 text-white flex items-center justify-center gap-2" style={{ background: podeSalvarTodos ? "#1E46E6" : "#DCE1F5" }}>
            {salvando && <Loader2 size={16} className="animate-spin" />}
            Salvar estoque
          </button>
        </div>
      </Shell>
    );
  }

  // sucesso
  return (
    <Shell>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#1F8A70]">
          <Check size={26} color="#FFFFFF" />
        </div>
        <h2 className="fonte-titulo text-lg font-bold text-[#0B1440]">Estoque atualizado</h2>
        <div className="text-sm text-[#6B7699] space-y-0.5">
          {itens.map((item, i) => (
            <p key={i}>{item.modeloNome} · {item.corNome} · {item.qtd} unid.</p>
          ))}
          <p className="mt-1">{lojaNome}</p>
        </div>
      </div>
      <button onClick={irParaMesmaLojaOutroItem} className="w-full rounded-md py-3 text-sm font-semibold mb-3 text-white bg-[#1E46E6]">
        Atualizar outro item
      </button>
      <button onClick={irParaOutraLoja} className="w-full rounded-xl p-4 mb-3 flex items-center gap-3 border-2 border-[#1E46E6] bg-white text-[#0B1440]">
        <Store size={22} className="text-[#1E46E6]" />
        <div className="fonte-titulo font-bold text-sm">Atualizar outra loja</div>
      </button>
      <a href="/venda" className="w-full rounded-xl p-4 mb-3 flex items-center gap-3 border-2 border-[#1E46E6] bg-white text-[#0B1440]">
        <PlusCircle size={22} className="text-[#1E46E6]" />
        <div className="fonte-titulo font-bold text-sm">Inserir nova venda</div>
      </a>
      <a href="/" className="block w-full text-center text-xs text-[#6B7699]">Voltar para a Home</a>
    </Shell>
  );
}

export default function EstoquePage() {
  return (
    <Suspense fallback={<Shell><div className="flex items-center justify-center py-20 text-[#6B7699] gap-2"><Loader2 size={18} className="animate-spin" /> Carregando…</div></Shell>}>
      <EstoqueConteudo />
    </Suspense>
  );
}
