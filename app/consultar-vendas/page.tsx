"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Receipt, Box as BoxIcon, ChevronRight } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, FixedSelect, TextField } from "../_components/ui";

type VendaRow = {
  id: number;
  imei: string | null;
  imei2: string | null;
  valor: number | null;
  data_venda: string | null;
  numero_nota: string | null;
  nome_vendedor: string | null;
  sobrenome_vendedor: string | null;
  observacao: string | null;
  foto_url: string | null;
  foto_url_caixa: string | null;
  Promotores: { NOME_COMPLETO: string } | null;
  Lojas: { LOJA: string; CIDADE: string } | null;
  Modelos: { MODELO: string } | null;
  Cores: { COR_BR: string } | null;
};

function formatarData(iso: string | null) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function ConsultarVendasPage() {
  const supabase = createClient();

  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState("");
  const [modoGestor, setModoGestor] = useState(false);

  // listas de referência pros filtros de select
  const [promotoresNomes, setPromotoresNomes] = useState<string[]>([]);
  const [lojasNomes, setLojasNomes] = useState<string[]>([]);
  const [modelosNomes, setModelosNomes] = useState<string[]>([]);
  const [coresNomes, setCoresNomes] = useState<string[]>([]);

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
          const { data: promotorProprio } = await supabase
            .schema("JOVI")
            .from("Promotores")
            .select("is_gestor")
            .eq("auth_user_id", uid)
            .maybeSingle();
          if (!promotorProprio?.is_gestor) {
            setErroCarregar("Só supervisores ou gestores consultam vendas da equipe.");
            setCarregando(false);
            return;
          }
          setModoGestor(true);
        }

        // a RLS já filtra sozinha (equipe do supervisor, ou tudo se gestor)
        const { data, error } = await supabase
          .schema("JOVI")
          .from("Vendas")
          .select(
            `id, imei, imei2, valor, data_venda, numero_nota, nome_vendedor, sobrenome_vendedor, observacao, foto_url, foto_url_caixa,
             Promotores ( NOME_COMPLETO ),
             Lojas ( LOJA, CIDADE ),
             Modelos ( MODELO ),
             Cores ( COR_BR )`
          )
          .order("data_venda", { ascending: false });

        if (error) throw error;
        const linhas = (data as any) || [];
        setVendas(linhas);

        setPromotoresNomes([...new Set(linhas.map((v: VendaRow) => v.Promotores?.NOME_COMPLETO).filter(Boolean))] as string[]);
        setLojasNomes([...new Set(linhas.map((v: VendaRow) => v.Lojas?.LOJA).filter(Boolean))] as string[]);
        setModelosNomes([...new Set(linhas.map((v: VendaRow) => v.Modelos?.MODELO).filter(Boolean))] as string[]);
        setCoresNomes([...new Set(linhas.map((v: VendaRow) => v.Cores?.COR_BR).filter(Boolean))] as string[]);
      } catch (e) {
        setErroCarregar("Não foi possível carregar as vendas. Recarregue a página.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // ---- filtros ----
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");
  const [filtroPromotor, setFiltroPromotor] = useState("");
  const [filtroLoja, setFiltroLoja] = useState("");
  const [filtroModelo, setFiltroModelo] = useState("");
  const [filtroCor, setFiltroCor] = useState("");
  const [filtroImei, setFiltroImei] = useState("");
  const [filtroNumeroNota, setFiltroNumeroNota] = useState("");

  function limparFiltros() {
    setFiltroDataDe(""); setFiltroDataAte(""); setFiltroPromotor(""); setFiltroLoja("");
    setFiltroModelo(""); setFiltroCor(""); setFiltroImei(""); setFiltroNumeroNota("");
  }

  const vendasFiltradas = vendas.filter((v) => {
    if (filtroDataDe && (!v.data_venda || v.data_venda < filtroDataDe)) return false;
    if (filtroDataAte && (!v.data_venda || v.data_venda > filtroDataAte)) return false;
    if (filtroPromotor && v.Promotores?.NOME_COMPLETO !== filtroPromotor) return false;
    if (filtroLoja && v.Lojas?.LOJA !== filtroLoja) return false;
    if (filtroModelo && v.Modelos?.MODELO !== filtroModelo) return false;
    if (filtroCor && v.Cores?.COR_BR !== filtroCor) return false;
    if (filtroImei && !(v.imei || "").includes(filtroImei) && !(v.imei2 || "").includes(filtroImei)) return false;
    if (filtroNumeroNota && !(v.numero_nota || "").includes(filtroNumeroNota)) return false;
    return true;
  });

  // ---- detalhe da venda selecionada ----
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaRow | null>(null);
  const [urlFotoNota, setUrlFotoNota] = useState<string | null>(null);
  const [urlFotoCaixa, setUrlFotoCaixa] = useState<string | null>(null);
  const [carregandoFotos, setCarregandoFotos] = useState(false);

  async function abrirDetalhe(venda: VendaRow) {
    setVendaSelecionada(venda);
    setUrlFotoNota(null);
    setUrlFotoCaixa(null);
    setCarregandoFotos(true);
    const [nota, caixa] = await Promise.all([
      venda.foto_url
        ? supabase.storage.from("comprovantes-venda").createSignedUrl(venda.foto_url, 300)
        : Promise.resolve({ data: null }),
      venda.foto_url_caixa
        ? supabase.storage.from("comprovantes-venda").createSignedUrl(venda.foto_url_caixa, 300)
        : Promise.resolve({ data: null }),
    ]);
    setUrlFotoNota((nota as any)?.data?.signedUrl || null);
    setUrlFotoCaixa((caixa as any)?.data?.signedUrl || null);
    setCarregandoFotos(false);
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
        <Header title="Consultar vendas" backHref="/" />
        <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{erroCarregar}</div>
      </Shell>
    );
  }

  // ---- tela de detalhe ----
  if (vendaSelecionada) {
    const v = vendaSelecionada;
    return (
      <Shell>
        <Header title="Detalhe da venda" onBack={() => setVendaSelecionada(null)} />
        <div className="rounded-lg border border-[#DCE1F5] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-[#6B7699] text-xs block">Promotor</span>{v.Promotores?.NOME_COMPLETO || "—"}</div>
            <div><span className="text-[#6B7699] text-xs block">Loja</span>{v.Lojas ? `${v.Lojas.CIDADE} — ${v.Lojas.LOJA}` : "—"}</div>
            <div><span className="text-[#6B7699] text-xs block">Modelo</span>{v.Modelos?.MODELO || "—"}</div>
            <div><span className="text-[#6B7699] text-xs block">Cor</span>{v.Cores?.COR_BR || "—"}</div>
            <div><span className="text-[#6B7699] text-xs block">IMEI 1</span><span className="fonte-mono">{v.imei || "—"}</span></div>
            <div><span className="text-[#6B7699] text-xs block">IMEI 2</span><span className="fonte-mono">{v.imei2 || "—"}</span></div>
            <div><span className="text-[#6B7699] text-xs block">Valor</span>R$ {v.valor ?? "—"}</div>
            <div><span className="text-[#6B7699] text-xs block">Data da venda</span>{formatarData(v.data_venda)}</div>
            <div><span className="text-[#6B7699] text-xs block">Número da nota</span><span className="fonte-mono">{v.numero_nota || "—"}</span></div>
            <div><span className="text-[#6B7699] text-xs block">Vendedor</span>{[v.nome_vendedor, v.sobrenome_vendedor].filter(Boolean).join(" ") || "—"}</div>
          </div>
          {v.observacao && (
            <div className="text-sm">
              <span className="text-[#6B7699] text-xs block">Observação</span>{v.observacao}
            </div>
          )}

          <div>
            <div className="fonte-titulo text-sm font-bold text-[#0B1440] mb-2">Fotos</div>
            {carregandoFotos ? (
              <div className="flex items-center gap-2 text-sm text-[#6B7699]"><Loader2 size={16} className="animate-spin" /> Carregando fotos…</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  {urlFotoNota ? (
                    <img src={urlFotoNota} alt="Nota fiscal" className="w-full h-40 object-cover rounded-md border border-[#DCE1F5]" />
                  ) : (
                    <div className="w-full h-40 rounded-md border border-dashed border-[#DCE1F5] flex flex-col items-center justify-center text-[#6B7699]">
                      <Receipt size={20} />
                      <span className="text-xs mt-1">Sem foto</span>
                    </div>
                  )}
                  <span className="text-xs text-[#6B7699] mt-1 block">Nota fiscal</span>
                </div>
                <div className="text-center">
                  {urlFotoCaixa ? (
                    <img src={urlFotoCaixa} alt="Caixa" className="w-full h-40 object-cover rounded-md border border-[#DCE1F5]" />
                  ) : (
                    <div className="w-full h-40 rounded-md border border-dashed border-[#DCE1F5] flex flex-col items-center justify-center text-[#6B7699]">
                      <BoxIcon size={20} />
                      <span className="text-xs mt-1">Sem foto</span>
                    </div>
                  )}
                  <span className="text-xs text-[#6B7699] mt-1 block">Caixa</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ---- lista + filtros ----
  return (
    <Shell>
      <Header title={modoGestor ? "Consultar vendas (todas)" : "Consultar vendas"} backHref="/" />

      <div className="rounded-lg border border-[#DCE1F5] bg-white p-5 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="fonte-titulo text-sm font-bold text-[#0B1440]">Filtros</div>
          <button onClick={limparFiltros} className="flex items-center gap-1 text-xs text-[#6B7699]"><X size={12} /> Limpar</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-[#6B7699] mb-1">Data de</label>
            <input type="date" value={filtroDataDe} onChange={(e) => setFiltroDataDe(e.target.value)} className="w-full rounded-md border border-[#DCE1F5] bg-white py-2 px-3 text-sm outline-none text-[#0B1440]" />
          </div>
          <div>
            <label className="block text-[10px] text-[#6B7699] mb-1">Data até</label>
            <input type="date" value={filtroDataAte} onChange={(e) => setFiltroDataAte(e.target.value)} className="w-full rounded-md border border-[#DCE1F5] bg-white py-2 px-3 text-sm outline-none text-[#0B1440]" />
          </div>
        </div>

        <FixedSelect value={filtroPromotor} onChange={setFiltroPromotor} options={promotoresNomes} placeholder="Promotor (todos)" />
        <FixedSelect value={filtroLoja} onChange={setFiltroLoja} options={lojasNomes} placeholder="Loja (todas)" />
        <div className="grid grid-cols-2 gap-3">
          <FixedSelect value={filtroModelo} onChange={setFiltroModelo} options={modelosNomes} placeholder="Modelo (todos)" />
          <FixedSelect value={filtroCor} onChange={setFiltroCor} options={coresNomes} placeholder="Cor (todas)" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField value={filtroImei} onChange={setFiltroImei} placeholder="IMEI" mono />
          <TextField value={filtroNumeroNota} onChange={setFiltroNumeroNota} placeholder="Número da nota" mono />
        </div>
      </div>

      <div className="fonte-titulo text-sm font-bold text-[#0B1440] mb-3">
        {vendasFiltradas.length} venda{vendasFiltradas.length === 1 ? "" : "s"}
      </div>

      {vendasFiltradas.length === 0 && <p className="text-sm text-[#6B7699]">Nenhuma venda encontrada com esses filtros.</p>}

      <div className="space-y-2">
        {vendasFiltradas.map((v) => (
          <button
            key={v.id}
            onClick={() => abrirDetalhe(v)}
            className="w-full text-left rounded-lg border border-[#DCE1F5] bg-white p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#0B1440] truncate">{v.Modelos?.MODELO || "—"} · {v.Cores?.COR_BR || "—"}</div>
              <div className="text-xs text-[#6B7699] truncate">{v.Promotores?.NOME_COMPLETO || "—"} · {v.Lojas?.LOJA || "—"}</div>
              <div className="fonte-mono text-[11px] text-[#6B7699]">{formatarData(v.data_venda)} · IMEI {v.imei || "—"}</div>
            </div>
            <ChevronRight size={18} className="text-[#6B7699] shrink-0" />
          </button>
        ))}
      </div>
    </Shell>
  );
}
