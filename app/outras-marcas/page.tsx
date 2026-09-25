"use client";

import { useEffect, useState } from "react";
import { Store, MapPin, Building2, Minus, Plus, Check, Loader2, AlertCircle, PlusCircle } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, FixedSelect } from "../_components/ui";

type LojaRow = { id: number; CUSTOMER: string; UF: string; CIDADE: string; LOJA: string };

export default function OutrasMarcasPage() {
  const supabase = createClient();

  const [lojas, setLojas] = useState<LojaRow[]>([]);
  const [promotorId, setPromotorId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return;

        const { data: promotor } = await supabase
          .schema("JOVI")
          .from("Promotores")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (!promotor) {
          setErroCarregar("Só promotores registram vendas de outras marcas.");
          setCarregando(false);
          return;
        }
        setPromotorId((promotor as any).id);

        const { data: lojasRes } = await supabase.schema("JOVI").from("Lojas").select("id:ID, CUSTOMER, UF, CIDADE, LOJA");
        setLojas((lojasRes as any) || []);
      } catch (e) {
        setErroCarregar("Não foi possível carregar os dados. Recarregue a página.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const [rede, setRede] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [lojaNome, setLojaNome] = useState("");
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [marca, setMarca] = useState("");
  const [qtd, setQtd] = useState(1);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);

  const redesDisponiveis = [...new Set(lojas.map((l) => l.CUSTOMER))];
  const ufsDisponiveis = rede ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede).map((l) => l.UF))] : [];
  const cidadesDisponiveis = rede && uf ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf).map((l) => l.CIDADE))] : [];
  const lojasDisponiveis = rede && uf && cidade ? lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade).map((l) => l.LOJA) : [];

  function selecionarLoja(nome: string) {
    setLojaNome(nome);
    const encontrada = lojas.find((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade && l.LOJA === nome);
    setLojaId(encontrada ? encontrada.id : null);
  }

  const podeSalvar = !!lojaId && !!marca.trim() && qtd > 0 && !!periodoInicio && !!periodoFim && periodoFim >= periodoInicio;

  async function handleRegistrar() {
    setErroEnvio("");
    if (!podeSalvar || !promotorId) return;
    setEnviando(true);
    const { error } = await supabase.schema("JOVI").from("VendasOutrasMarcas").insert({
      promotor_id: promotorId,
      loja_id: lojaId,
      marca: marca.trim(),
      quantidade: qtd,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
    });
    setEnviando(false);
    if (error) {
      setErroEnvio("Não foi possível registrar. Tente novamente.");
      return;
    }
    setSucesso(true);
  }

  function resetar() {
    setRede(""); setUf(""); setCidade(""); setLojaNome(""); setLojaId(null);
    setMarca(""); setQtd(1); setPeriodoInicio(""); setPeriodoFim(""); setSucesso(false);
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
        <Header title="Vendas de outras marcas" backHref="/" />
        <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{erroCarregar}</div>
      </Shell>
    );
  }

  if (sucesso) {
    return (
      <Shell>
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#1F8A70]">
            <Check size={26} color="#FFFFFF" />
          </div>
          <h2 className="fonte-titulo text-lg font-bold text-[#0B1440]">Venda registrada</h2>
          <p className="text-sm text-[#6B7699]">{marca} · {qtd} unid. · {lojaNome}</p>
          <p className="text-xs text-[#6B7699]">Período: {periodoInicio.split("-").reverse().join("/")} até {periodoFim.split("-").reverse().join("/")}</p>
        </div>
        <button onClick={resetar} className="w-full rounded-xl p-4 mb-3 flex items-center gap-3 border-2 border-[#1E46E6] bg-white text-[#0B1440]">
          <PlusCircle size={22} className="text-[#1E46E6]" />
          <div className="fonte-titulo font-bold text-sm">Registrar outra</div>
        </button>
        <a href="/" className="block w-full text-center text-xs text-[#6B7699]">Ir para a Home</a>
      </Shell>
    );
  }

  return (
    <Shell>
      <Header title="Vendas de outras marcas" backHref="/" />
      <div className="rounded-lg border border-[#DCE1F5] bg-white p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-2 text-[#0B1440]">Loja</label>
          <div className="space-y-3">
            <FixedSelect value={rede} onChange={(v) => { setRede(v); setUf(""); setCidade(""); selecionarLoja(""); }} options={redesDisponiveis} placeholder="Rede" icon={Building2} required />
            {rede && <FixedSelect value={uf} onChange={(v) => { setUf(v); setCidade(""); selecionarLoja(""); }} options={ufsDisponiveis} placeholder="UF" icon={MapPin} required />}
            {rede && uf && <FixedSelect value={cidade} onChange={(v) => { setCidade(v); selecionarLoja(""); }} options={cidadesDisponiveis} placeholder="Cidade" icon={MapPin} required />}
            {rede && uf && cidade && <FixedSelect value={lojaNome} onChange={selecionarLoja} options={lojasDisponiveis} placeholder="Loja" icon={Store} required />}
          </div>
        </div>

        <FixedSelect value={marca} onChange={setMarca} options={["Apple", "Motorola", "Oppo", "Samsung", "Venda Total da Loja"]} placeholder="Marca vendida (ex: Motorola, Oppo, Samsung)" required />

        <div>
          <label className="block text-xs font-semibold mb-2 text-[#0B1440]">Período de apuração</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#6B7699] mb-1">De *</label>
              <input type="date" value={periodoInicio} max={hoje} onChange={(e) => { setPeriodoInicio(e.target.value); if (periodoFim && e.target.value > periodoFim) setPeriodoFim(""); }} className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]" />
            </div>
            <div>
              <label className="block text-[10px] text-[#6B7699] mb-1">Até *</label>
              <input type="date" value={periodoFim} min={periodoInicio || undefined} max={hoje} onChange={(e) => setPeriodoFim(e.target.value)} className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2 text-[#0B1440]">Quantidade vendida</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setQtd(Math.max(1, qtd - 1))} className="w-11 h-11 rounded-full flex items-center justify-center bg-[#EAF0FF] text-[#1E46E6]">
              <Minus size={18} />
            </button>
            <div className="fonte-mono flex-1 text-center text-2xl font-bold rounded-md py-2 text-[#0B1440] bg-white border border-[#DCE1F5]">
              {qtd}
            </div>
            <button onClick={() => setQtd(qtd + 1)} className="w-11 h-11 rounded-full flex items-center justify-center bg-[#1E46E6] text-white">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {erroEnvio && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroEnvio}</div>}

        <button disabled={!podeSalvar || enviando} onClick={handleRegistrar} className="w-full rounded-md py-3 text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: podeSalvar ? "#1E46E6" : "#DCE1F5" }}>
          {enviando && <Loader2 size={16} className="animate-spin" />}
          Registrar venda
        </button>
      </div>
    </Shell>
  );
}
