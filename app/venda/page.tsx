"use client";

import { useEffect, useState } from "react";
import {
  Store, MapPin, Building2, Smartphone, Palette, Receipt, Box, Check,
  Pencil, Loader2, AlertCircle, PlusCircle, Sparkles,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, FixedSelect, TypeableSelect, TextField, TextArea, StepShell } from "../_components/ui";

type LojaRow = { id: number; CUSTOMER: string; UF: string; CIDADE: string; LOJA: string };
type ModeloRow = { id: number; MODELO: string };
type CorRow = { id: number; COR: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function VendaPage() {
  const supabase = createClient();

  // ---- dados de referência ----
  const [lojas, setLojas] = useState<LojaRow[]>([]);
  const [modelos, setModelos] = useState<ModeloRow[]>([]);
  const [cores, setCores] = useState<CorRow[]>([]);
  const [promotorId, setPromotorId] = useState<number | null>(null);
  const [carregandoReferencia, setCarregandoReferencia] = useState(true);
  const [erroReferencia, setErroReferencia] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;

        const [lojasRes, modelosRes, coresRes, promotorRes] = await Promise.all([
          supabase.schema("JOVI").from("Lojas").select('id:ID, CUSTOMER, UF, CIDADE, LOJA'),
          supabase.schema("JOVI").from("Modelos").select("id, MODELO").eq("EM_VENDA", true),
          supabase.schema("JOVI").from("Cores").select("id, COR"),
          uid
            ? supabase.schema("JOVI").from("Promotores").select("id").eq("auth_user_id", uid).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        setLojas((lojasRes.data as any) || []);
        setModelos((modelosRes.data as any) || []);
        setCores((coresRes.data as any) || []);
        setPromotorId((promotorRes.data as any)?.id ?? null);
      } catch (e) {
        setErroReferencia("Não foi possível carregar os dados. Recarregue a página.");
      } finally {
        setCarregandoReferencia(false);
      }
    })();
  }, []);

  // ---- passo 1: localização ----
  const [openStep, setOpenStep] = useState(1);
  const [rede, setRede] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [lojaNome, setLojaNome] = useState("");
  const [lojaId, setLojaId] = useState<number | null>(null);

  const redesDisponiveis = [...new Set(lojas.map((l) => l.CUSTOMER))];
  const ufsDisponiveis = rede ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede).map((l) => l.UF))] : [];
  const cidadesDisponiveis = rede && uf ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf).map((l) => l.CIDADE))] : [];
  const lojasDisponiveis = rede && uf && cidade ? lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade).map((l) => l.LOJA) : [];

  function selecionarLoja(nome: string) {
    setLojaNome(nome);
    const encontrada = lojas.find((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade && l.LOJA === nome);
    setLojaId(encontrada ? encontrada.id : null);
    if (encontrada) setOpenStep(2);
  }

  // ---- passo 2: comprovante ----
  const [manualMode, setManualMode] = useState(false);
  const [fileNota, setFileNota] = useState<File | null>(null);
  const [fileCaixa, setFileCaixa] = useState<File | null>(null);
  const [previewNota, setPreviewNota] = useState<string | null>(null);
  const [previewCaixa, setPreviewCaixa] = useState<string | null>(null);
  const [ocrLoadingNota, setOcrLoadingNota] = useState(false);
  const [ocrLoadingCaixa, setOcrLoadingCaixa] = useState(false);
  const [ocrErrorNota, setOcrErrorNota] = useState("");
  const [ocrErrorCaixa, setOcrErrorCaixa] = useState("");

  const [aparelhoNome, setAparelhoNome] = useState("");
  const [aparelhoId, setAparelhoId] = useState<number | null>(null);
  const [corNome, setCorNome] = useState("");
  const [corId, setCorId] = useState<number | null>(null);
  const [imei, setImei] = useState("");
  const [imei2, setImei2] = useState("");
  const [numeroNota, setNumeroNota] = useState("");
  const [dataVenda, setDataVenda] = useState("");
  const [valor, setValor] = useState("");

  // ---- passo 3: identificação do vendedor ----
  const [nomeVendedor, setNomeVendedor] = useState("");
  const [sobrenomeVendedor, setSobrenomeVendedor] = useState("");
  const [observacao, setObservacao] = useState("");

  const step1Done = !!lojaId;
  const step2Done = !!aparelhoId && !!corId && !!imei && !!dataVenda && !!valor;
  const step3Done = !!nomeVendedor && !!sobrenomeVendedor;

  function aplicarModeloPorNome(produtoTexto: string) {
    if (!produtoTexto) return;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
    const alvo = norm(produtoTexto);
    let match = modelos.find((m) => norm(m.MODELO) === alvo);
    if (!match) {
      const escapado = produtoTexto.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapado}(?=[\\s(]|$)`, "i");
      match = modelos.find((m) => regex.test(m.MODELO));
    }
    if (match) {
      setAparelhoNome(match.MODELO);
      setAparelhoId(match.id);
    }
  }

  async function chamarOcr(file: File, prompt: string) {
    const imageBase64 = await fileToBase64(file);
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mediaType: file.type || "image/jpeg", prompt }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Falha no OCR");
    const textBlock = (data.content || []).find((b: any) => b.type === "text");
    const raw = textBlock ? textBlock.text : "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }

  function handleAnexarNota(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileNota(file);
    setPreviewNota(URL.createObjectURL(file));
    setOcrErrorNota("");
  }

  function handleAnexarCaixa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileCaixa(file);
    setPreviewCaixa(URL.createObjectURL(file));
    setOcrErrorCaixa("");
  }

  async function processarNota(file: File) {
    setOcrErrorNota("");
    try {
      const parsed = await chamarOcr(
        file,
        `Esta é uma nota fiscal de venda de aparelho celular. Extraia os dados e responda APENAS com um objeto JSON válido (sem markdown, sem texto extra), no formato: {"numero_nota": string ou null, "data_venda": string "DD/MM/AAAA" ou null, "valor": string apenas números (ex: 2500.00) ou null}. Se não conseguir ler algum campo com confiança, use null nele.`
      );
      if (parsed.numero_nota) setNumeroNota(String(parsed.numero_nota));
      if (parsed.data_venda) setDataVenda(String(parsed.data_venda));
      if (parsed.valor) setValor(String(parsed.valor));
    } catch (e) {
      setOcrErrorNota("Não consegui ler a nota automaticamente. Confira/preencha os campos manualmente.");
    }
  }

  async function processarCaixa(file: File) {
    setOcrErrorCaixa("");
    try {
      const parsed = await chamarOcr(
        file,
        `Esta é uma foto da caixa/embalagem de um aparelho celular. Extraia os dados e responda APENAS com um objeto JSON válido (sem markdown, sem texto extra), no formato: {"produto": string ou null (nome curto no canto superior esquerdo da caixa, JUNTO com RAM e ROM entre parênteses, formato "Modelo(RAM+ROMG)", ex: "Y21(4+256G)"), "cor": string ou null, "imei1": string ou null, "imei2": string ou null}. Se não conseguir ler algum campo com confiança, use null nele.`
      );
      if (parsed.produto) aplicarModeloPorNome(String(parsed.produto));
      if (parsed.cor) {
        const matchCor = cores.find((c) => c.COR.toLowerCase() === String(parsed.cor).toLowerCase());
        if (matchCor) {
          setCorNome(matchCor.COR);
          setCorId(matchCor.id);
        }
      }
      if (parsed.imei1) setImei(String(parsed.imei1));
      if (parsed.imei2) setImei2(String(parsed.imei2));
    } catch (e) {
      setOcrErrorCaixa("Não consegui ler a caixa automaticamente. Confira/preencha os campos manualmente.");
    }
  }

  async function extrairDados() {
    const tarefas: Promise<void>[] = [];
    if (fileNota) {
      setOcrLoadingNota(true);
      tarefas.push(processarNota(fileNota).finally(() => setOcrLoadingNota(false)));
    }
    if (fileCaixa) {
      setOcrLoadingCaixa(true);
      tarefas.push(processarCaixa(fileCaixa).finally(() => setOcrLoadingCaixa(false)));
    }
    await Promise.allSettled(tarefas);
    setManualMode(true);
  }

  // ---- envio final ----
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [sucesso, setSucesso] = useState(false);

  function dataParaISO(dataBR: string): string | null {
    const digitos = dataBR.replace(/\D/g, "");
    if (digitos.length !== 8) return null;
    return `${digitos.slice(4, 8)}-${digitos.slice(2, 4)}-${digitos.slice(0, 2)}`;
  }

  async function handleRegistrarVenda() {
    setErroEnvio("");
    if (!promotorId) {
      setErroEnvio("Só promotores podem registrar vendas.");
      return;
    }
    const dataISO = dataParaISO(dataVenda);
    if (!dataISO) {
      setErroEnvio("Data da venda inválida.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.schema("JOVI").from("Vendas").insert({
      promotor_id: promotorId,
      loja_id: lojaId,
      modelo_id: aparelhoId,
      cor_id: corId,
      imei,
      imei2: imei2 || null,
      valor: parseFloat(valor.replace(",", ".")),
      data_venda: dataISO,
      numero_nota: numeroNota || null,
      nome_vendedor: nomeVendedor,
      sobrenome_vendedor: sobrenomeVendedor,
      observacao: observacao || null,
    });
    setEnviando(false);

    if (error) {
      setErroEnvio("Não foi possível registrar a venda. Tente novamente.");
      return;
    }
    setSucesso(true);
  }

  function resetarTudo() {
    setOpenStep(1);
    setRede(""); setUf(""); setCidade(""); setLojaNome(""); setLojaId(null);
    setManualMode(false);
    setFileNota(null); setFileCaixa(null); setPreviewNota(null); setPreviewCaixa(null);
    setOcrErrorNota(""); setOcrErrorCaixa("");
    setAparelhoNome(""); setAparelhoId(null);
    setCorNome(""); setCorId(null);
    setImei(""); setImei2(""); setNumeroNota(""); setDataVenda(""); setValor("");
    setNomeVendedor(""); setSobrenomeVendedor(""); setObservacao("");
    setErroEnvio(""); setSucesso(false);
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

  if (sucesso) {
    return (
      <Shell>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#1F8A70]">
            <Check size={26} color="#FFFFFF" />
          </div>
          <h2 className="fonte-titulo text-lg font-bold text-[#0B1440]">Venda registrada</h2>
          <p className="text-sm text-[#6B7699]">{aparelhoNome} · {cidade} — {lojaNome}</p>
        </div>

        <a
          href={`/estoque?loja=${encodeURIComponent(lojaNome)}`}
          className="w-full rounded-xl p-5 mb-3 flex items-center gap-3 text-white"
          style={{ background: "#E8601C", animation: "pulseGlow 1.8s infinite" }}
        >
          <Sparkles size={24} />
          <div>
            <div className="fonte-titulo font-bold text-base">Aproveite e atualize o estoque</div>
            <div className="text-xs opacity-90">desta loja ({lojaNome}) agora</div>
          </div>
        </a>

        <a href="/estoque" className="block w-full text-center text-sm font-semibold py-2 mb-3 text-[#1E46E6]">
          Atualizar estoque de outra loja
        </a>

        <button onClick={resetarTudo} className="w-full rounded-xl p-4 mb-3 flex items-center gap-3 border-2 border-[#1E46E6] bg-white text-[#0B1440]">
          <PlusCircle size={22} className="text-[#1E46E6]" />
          <div className="fonte-titulo font-bold text-sm">Inserir nova venda</div>
        </button>

        <a href="/" className="block w-full text-center text-xs text-[#6B7699]">Ir para a Home</a>
      </Shell>
    );
  }

  return (
    <Shell>
      <Header title="Nova venda" backHref="/" />
      <div className="rounded-lg border border-[#DCE1F5] bg-white overflow-hidden">
        <div className="px-5">
          <StepShell number={1} title="Localização" done={step1Done} open={openStep === 1} onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)} summary={step1Done ? `${rede} · ${cidade} — ${lojaNome}` : ""}>
            <div className="space-y-3">
              <TypeableSelect listId="lista-redes" value={rede} onChange={(v) => { setRede(v); setUf(""); setCidade(""); selecionarLoja(""); }} options={redesDisponiveis} placeholder="Rede" icon={Building2} />
              {rede && <TypeableSelect listId="lista-ufs" value={uf} onChange={(v) => { setUf(v); setCidade(""); selecionarLoja(""); }} options={ufsDisponiveis} placeholder="UF" icon={MapPin} />}
              {rede && uf && <TypeableSelect listId="lista-cidades" value={cidade} onChange={(v) => { setCidade(v); selecionarLoja(""); }} options={cidadesDisponiveis} placeholder="Cidade" icon={MapPin} />}
              {rede && uf && cidade && <TypeableSelect listId="lista-lojas" value={lojaNome} onChange={selecionarLoja} options={lojasDisponiveis} placeholder="Loja" icon={Store} />}
            </div>
          </StepShell>

          <StepShell number={2} title="Comprovante da venda" done={step2Done} open={openStep === 2} onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)} summary={step2Done ? `${aparelhoNome} · R$ ${valor}` : ""}>
            <div className="space-y-4">
              {!manualMode && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed py-6 px-2 cursor-pointer text-center" style={{ borderColor: previewNota ? "#1F8A70" : "#DCE1F5" }}>
                      {ocrLoadingNota ? <Loader2 size={20} className="animate-spin text-[#1E46E6]" /> : previewNota ? <img src={previewNota} alt="prévia nota" className="h-16 rounded-md object-cover" /> : <Receipt size={20} className="text-[#6B7699]" />}
                      <span className="text-xs font-medium text-[#0B1440]">{previewNota ? "✓ Nota anexada" : "Nota fiscal"}</span>
                      {!previewNota && <span className="text-[10px] text-[#6B7699]">nº nota, data, valor</span>}
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAnexarNota} />
                    </label>
                    {ocrErrorNota && <div className="flex items-start gap-1 mt-1.5 text-[11px] text-red-700"><AlertCircle size={12} className="shrink-0 mt-0.5" />{ocrErrorNota}</div>}
                  </div>
                  <div>
                    <label className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed py-6 px-2 cursor-pointer text-center" style={{ borderColor: previewCaixa ? "#1F8A70" : "#DCE1F5" }}>
                      {ocrLoadingCaixa ? <Loader2 size={20} className="animate-spin text-[#1E46E6]" /> : previewCaixa ? <img src={previewCaixa} alt="prévia caixa" className="h-16 rounded-md object-cover" /> : <Box size={20} className="text-[#6B7699]" />}
                      <span className="text-xs font-medium text-[#0B1440]">{previewCaixa ? "✓ Caixa anexada" : "Foto da caixa"}</span>
                      {!previewCaixa && <span className="text-[10px] text-[#6B7699]">produto, cor, IMEI</span>}
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAnexarCaixa} />
                    </label>
                    {ocrErrorCaixa && <div className="flex items-start gap-1 mt-1.5 text-[11px] text-red-700"><AlertCircle size={12} className="shrink-0 mt-0.5" />{ocrErrorCaixa}</div>}
                  </div>
                  <button onClick={extrairDados} disabled={(!fileNota && !fileCaixa) || ocrLoadingNota || ocrLoadingCaixa} className="col-span-2 rounded-md py-2.5 text-sm font-semibold flex items-center justify-center gap-2 text-white" style={{ background: (fileNota || fileCaixa) ? "#1E46E6" : "#DCE1F5" }}>
                    {(ocrLoadingNota || ocrLoadingCaixa) ? <Loader2 size={16} className="animate-spin" /> : null}
                    Continuar com a extração
                  </button>
                  <button onClick={() => setManualMode(true)} className="col-span-2 flex items-center justify-center gap-1.5 text-xs text-[#6B7699]">
                    <Pencil size={12} /> preencher manualmente
                  </button>
                </div>
              )}

              {manualMode && (
                <div className="space-y-3">
                  {(previewNota || previewCaixa) && (
                    <div className="flex gap-2">
                      {previewNota && <img src={previewNota} alt="" className="h-16 rounded-md object-cover border border-[#DCE1F5]" />}
                      {previewCaixa && <img src={previewCaixa} alt="" className="h-16 rounded-md object-cover border border-[#DCE1F5]" />}
                    </div>
                  )}
                  <FixedSelect value={aparelhoNome} onChange={(v) => { setAparelhoNome(v); setAparelhoId(modelos.find((m) => m.MODELO === v)?.id ?? null); }} options={modelos.map((m) => m.MODELO)} placeholder="Produto (Modelo+RAM+ROM)" icon={Smartphone} required />
                  <div className="grid grid-cols-2 gap-3">
                    <FixedSelect value={corNome} onChange={(v) => { setCorNome(v); setCorId(cores.find((c) => c.COR === v)?.id ?? null); }} options={cores.map((c) => c.COR)} placeholder="Cor" icon={Palette} required />
                    <TextField value={imei} onChange={setImei} placeholder="IMEI 1" mono required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField value={imei2} onChange={setImei2} placeholder="IMEI 2 (opcional)" mono />
                    <TextField value={numeroNota} onChange={setNumeroNota} placeholder="Número da nota" mono />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField value={valor} onChange={setValor} placeholder="Valor (R$)" mono required />
                    <TextField value={dataVenda} onChange={setDataVenda} placeholder="Data (DD/MM/AAAA)" mono required />
                  </div>
                  <button onClick={() => { setManualMode(false); setPreviewNota(null); setPreviewCaixa(null); setFileNota(null); setFileCaixa(null); }} className="text-xs text-[#6B7699]">
                    ← usar foto / OCR em vez disso
                  </button>
                </div>
              )}
            </div>
          </StepShell>

          <StepShell number={3} title="Identificação do vendedor" done={step3Done} open={openStep === 3} onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)} summary={step3Done ? `${nomeVendedor} ${sobrenomeVendedor}` : ""}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField value={nomeVendedor} onChange={setNomeVendedor} placeholder="Nome" required />
                <TextField value={sobrenomeVendedor} onChange={setSobrenomeVendedor} placeholder="Sobrenome" required />
              </div>
              <TextArea value={observacao} onChange={setObservacao} placeholder="Observação (opcional)" />
            </div>
          </StepShell>
        </div>

        <div className="px-5 py-4">
          {erroEnvio && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 mb-3 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroEnvio}</div>}
          <button
            onClick={handleRegistrarVenda}
            disabled={!step1Done || !step2Done || !step3Done || enviando}
            className="w-full rounded-md py-3 text-sm font-semibold flex items-center justify-center gap-2 text-white"
            style={{ background: step1Done && step2Done && step3Done ? "#0B1440" : "#DCE1F5" }}
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {enviando ? "Registrando…" : "Registrar venda"}
          </button>
        </div>
      </div>
    </Shell>
  );
}
