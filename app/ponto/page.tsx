"use client";

import { useEffect, useState } from "react";
import { Store, MapPin, Building2, Camera, Loader2, AlertCircle, Check, Clock } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, TypeableSelect } from "../_components/ui";

type LojaRow = { id: number; CUSTOMER: string; UF: string; CIDADE: string; LOJA: string };
type TurnoAberto = { id: number; data_hora_entrada: string; loja_id: number };

export default function PontoPage() {
  const supabase = createClient();

  const [lojas, setLojas] = useState<LojaRow[]>([]);
  const [promotorId, setPromotorId] = useState<number | null>(null);
  const [turnoAberto, setTurnoAberto] = useState<TurnoAberto | null>(null);
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
          setErroCarregar("Só promotores registram ponto.");
          setCarregando(false);
          return;
        }
        setPromotorId((promotor as any).id);

        const [lojasRes, turnoRes] = await Promise.all([
          supabase.schema("JOVI").from("Lojas").select("id:ID, CUSTOMER, UF, CIDADE, LOJA"),
          supabase
            .schema("JOVI")
            .from("Ponto")
            .select("id, data_hora_entrada, loja_id")
            .eq("promotor_id", (promotor as any).id)
            .is("data_hora_saida", null)
            .maybeSingle(),
        ]);

        setLojas((lojasRes.data as any) || []);
        setTurnoAberto((turnoRes.data as any) || null);
      } catch (e) {
        setErroCarregar("Não foi possível carregar os dados. Recarregue a página.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // ---- fluxo de ENTRADA ----
  const [rede, setRede] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [lojaNome, setLojaNome] = useState("");
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [sucesso, setSucesso] = useState<"entrada" | "saida" | null>(null);

  const redesDisponiveis = [...new Set(lojas.map((l) => l.CUSTOMER))];
  const ufsDisponiveis = rede ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede).map((l) => l.UF))] : [];
  const cidadesDisponiveis = rede && uf ? [...new Set(lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf).map((l) => l.CIDADE))] : [];
  const lojasDisponiveis = rede && uf && cidade ? lojas.filter((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade).map((l) => l.LOJA) : [];

  function selecionarLoja(nome: string) {
    setLojaNome(nome);
    const encontrada = lojas.find((l) => l.CUSTOMER === rede && l.UF === uf && l.CIDADE === cidade && l.LOJA === nome);
    setLojaId(encontrada ? encontrada.id : null);
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setPreviewFoto(URL.createObjectURL(file));
  }

  async function handleRegistrarEntrada() {
    setErroEnvio("");
    if (!lojaId || !foto || !promotorId) {
      setErroEnvio("Escolha a loja e tire a foto antes de continuar.");
      return;
    }
    setEnviando(true);

    const caminho = `${promotorId}/${Date.now()}-entrada-${foto.name}`;
    const { error: erroUpload } = await supabase.storage.from("fotos-ponto").upload(caminho, foto);
    if (erroUpload) {
      setEnviando(false);
      setErroEnvio("Não foi possível enviar a foto. Tente novamente.");
      return;
    }

    const { error } = await supabase.schema("JOVI").from("Ponto").insert({
      promotor_id: promotorId,
      loja_id: lojaId,
      foto_entrada_url: caminho,
    });
    setEnviando(false);

    if (error) {
      setErroEnvio("Não foi possível registrar a entrada. Tente novamente.");
      return;
    }
    setSucesso("entrada");
  }

  async function handleRegistrarSaida() {
    if (!turnoAberto) return;
    setErroEnvio("");
    setEnviando(true);
    const { error } = await supabase
      .schema("JOVI")
      .from("Ponto")
      .update({ data_hora_saida: new Date().toISOString() })
      .eq("id", turnoAberto.id);
    setEnviando(false);

    if (error) {
      setErroEnvio("Não foi possível registrar a saída. Tente novamente.");
      return;
    }
    setSucesso("saida");
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
        <Header title="Registro de ponto" backHref="/" />
        <div className="text-sm text-red-700 bg-red-50 rounded-md p-3">{erroCarregar}</div>
      </Shell>
    );
  }

  if (sucesso === "entrada") {
    return (
      <Shell>
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#1F8A70]">
            <Check size={26} color="#FFFFFF" />
          </div>
          <h2 className="fonte-titulo text-lg font-bold text-[#0B1440]">Entrada registrada</h2>
          <p className="text-sm text-[#6B7699]">{lojaNome} · {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <a href="/" className="block w-full text-center text-sm font-semibold py-2 text-[#1E46E6]">Ir para a Home</a>
      </Shell>
    );
  }

  if (sucesso === "saida") {
    return (
      <Shell>
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#1F8A70]">
            <Check size={26} color="#FFFFFF" />
          </div>
          <h2 className="fonte-titulo text-lg font-bold text-[#0B1440]">Saída registrada</h2>
          <p className="text-sm text-[#6B7699]">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <a href="/" className="block w-full text-center text-sm font-semibold py-2 text-[#1E46E6]">Ir para a Home</a>
      </Shell>
    );
  }

  // ---- turno já aberto: só pede confirmação de saída ----
  if (turnoAberto) {
    return (
      <Shell>
        <Header title="Registro de ponto" backHref="/" />
        <div className="rounded-lg border border-[#DCE1F5] bg-white p-5 text-center">
          <Clock size={28} className="mx-auto mb-3 text-[#1F8A70]" />
          <p className="text-sm text-[#6B7699] mb-1">Turno aberto desde</p>
          <p className="fonte-titulo text-lg font-bold text-[#0B1440] mb-5">
            {new Date(turnoAberto.data_hora_entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {erroEnvio && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 mb-3 bg-red-50 text-red-700 text-left"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroEnvio}</div>}
          <button onClick={handleRegistrarSaida} disabled={enviando} className="w-full rounded-md py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 bg-[#1E46E6]">
            {enviando && <Loader2 size={16} className="animate-spin" />}
            Registrar saída agora
          </button>
        </div>
      </Shell>
    );
  }

  // ---- sem turno aberto: fluxo de entrada ----
  const podeRegistrar = !!lojaId && !!foto;
  return (
    <Shell>
      <Header title="Registrar entrada" backHref="/" />
      <div className="rounded-lg border border-[#DCE1F5] bg-white p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-2 text-[#0B1440]">Loja</label>
          <div className="space-y-3">
            <TypeableSelect listId="lista-redes-ponto" value={rede} onChange={(v) => { setRede(v); setUf(""); setCidade(""); selecionarLoja(""); }} options={redesDisponiveis} placeholder="Rede" icon={Building2} />
            {rede && <TypeableSelect listId="lista-ufs-ponto" value={uf} onChange={(v) => { setUf(v); setCidade(""); selecionarLoja(""); }} options={ufsDisponiveis} placeholder="UF" icon={MapPin} />}
            {rede && uf && <TypeableSelect listId="lista-cidades-ponto" value={cidade} onChange={(v) => { setCidade(v); selecionarLoja(""); }} options={cidadesDisponiveis} placeholder="Cidade" icon={MapPin} />}
            {rede && uf && cidade && <TypeableSelect listId="lista-lojas-ponto" value={lojaNome} onChange={selecionarLoja} options={lojasDisponiveis} placeholder="Loja" icon={Store} />}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2 text-[#0B1440]">Foto na chegada</label>
          <label className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed py-8 px-2 cursor-pointer text-center" style={{ borderColor: previewFoto ? "#1F8A70" : "#DCE1F5" }}>
            {previewFoto ? (
              <img src={previewFoto} alt="prévia" className="h-24 rounded-md object-cover" />
            ) : (
              <>
                <Camera size={22} className="text-[#6B7699]" />
                <span className="text-sm font-medium text-[#0B1440]">Tirar foto agora</span>
                <span className="text-[10px] text-[#6B7699]">a câmera abre direto — sem escolher da galeria</span>
              </>
            )}
            {/* capture="user" força a câmera frontal e impede anexar foto antiga da galeria */}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFoto} />
          </label>
        </div>

        {erroEnvio && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroEnvio}</div>}

        <button disabled={!podeRegistrar || enviando} onClick={handleRegistrarEntrada} className="w-full rounded-md py-3 text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: podeRegistrar ? "#E8601C" : "#DCE1F5" }}>
          {enviando && <Loader2 size={16} className="animate-spin" />}
          Registrar entrada
        </button>
      </div>
    </Shell>
  );
}
