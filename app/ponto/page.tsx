"use client";

import { useEffect, useState } from "react";
import { Store, MapPin, Building2, Camera, Loader2, AlertCircle, Check, Clock, MessageSquareWarning } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Shell, Header, TypeableSelect, FixedSelect } from "../_components/ui";

type LojaRow = { id: number; CUSTOMER: string; UF: string; CIDADE: string; LOJA: string };
type TurnoAberto = { id: number; data_hora_entrada: string; loja_id: number };

export default function PontoPage() {
  const supabase = createClient();

  const [lojas, setLojas] = useState<LojaRow[]>([]);
  const [entidadeId, setEntidadeId] = useState<number | null>(null);
  const [tabelaPonto, setTabelaPonto] = useState<"Ponto" | "Ponto_Supervisor">("Ponto");
  const [colunaId, setColunaId] = useState<"promotor_id" | "supervisor_id">("promotor_id");
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

        let tabela: "Ponto" | "Ponto_Supervisor" = "Ponto";
        let coluna: "promotor_id" | "supervisor_id" = "promotor_id";
        let id: number | null = null;

        if (promotor) {
          id = (promotor as any).id;
        } else {
          const { data: supervisor } = await supabase
            .schema("JOVI")
            .from("Supervisores")
            .select("id")
            .eq("auth_user_id", uid)
            .maybeSingle();
          if (supervisor) {
            tabela = "Ponto_Supervisor";
            coluna = "supervisor_id";
            id = (supervisor as any).id;
          }
        }

        if (id === null) {
          setErroCarregar("Só promotores ou supervisores registram ponto.");
          setCarregando(false);
          return;
        }
        setEntidadeId(id);
        setTabelaPonto(tabela);
        setColunaId(coluna);

        const [lojasRes, turnoRes] = await Promise.all([
          supabase.schema("JOVI").from("Lojas").select("id:ID, CUSTOMER, UF, CIDADE, LOJA"),
          supabase
            .schema("JOVI")
            .from(tabela)
            .select("id, data_hora_entrada, loja_id")
            .eq(coluna, id)
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
  const [fotoSaida, setFotoSaida] = useState<File | null>(null);
  const [previewFotoSaida, setPreviewFotoSaida] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [sucesso, setSucesso] = useState<"entrada" | "saida" | null>(null);

  // ---- justificativa de saída não registrada no dia anterior ----
  const [motivoJustificativa, setMotivoJustificativa] = useState("");
  const [horaJustificativa, setHoraJustificativa] = useState("");
  const [enviandoJustificativa, setEnviandoJustificativa] = useState(false);
  const [erroJustificativa, setErroJustificativa] = useState("");

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

  function handleFotoSaida(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoSaida(file);
    setPreviewFotoSaida(URL.createObjectURL(file));
  }

  function foiHoje(dataISO: string) {
    return new Date(dataISO).toDateString() === new Date().toDateString();
  }

  async function handleJustificarSaida() {
    if (!turnoAberto) return;
    setErroJustificativa("");
    if (!motivoJustificativa.trim() || !horaJustificativa) {
      setErroJustificativa("Informe o motivo e o horário de saída.");
      return;
    }
    setEnviandoJustificativa(true);

    // a saída aconteceu no MESMO DIA da entrada (só não foi registrada
    // na hora) — usamos a data da entrada + o horário informado agora
    const dataEntrada = turnoAberto.data_hora_entrada.slice(0, 10);
    const dataHoraSaida = new Date(`${dataEntrada}T${horaJustificativa}:00`).toISOString();

    const { error } = await supabase
      .schema("JOVI")
      .from(tabelaPonto)
      .update({ data_hora_saida: dataHoraSaida, justificativa_saida: motivoJustificativa.trim() })
      .eq("id", turnoAberto.id);
    setEnviandoJustificativa(false);

    if (error) {
      setErroJustificativa("Não foi possível salvar a justificativa. Tente novamente.");
      return;
    }
    // volta pro fluxo normal de registrar entrada
    setTurnoAberto(null);
    setMotivoJustificativa("");
    setHoraJustificativa("");
  }

  // Tenta pegar a localização do navegador. Se o promotor negar
  // permissão, o GPS falhar ou demorar demais, devolve null — NUNCA
  // trava o registro de ponto por causa disso.
  function obterLocalizacao(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (posicao) => resolve({ lat: posicao.coords.latitude, lng: posicao.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  async function handleRegistrarEntrada() {
    setErroEnvio("");
    if (!lojaId || !foto || !entidadeId) {
      setErroEnvio("Escolha a loja e tire a foto antes de continuar.");
      return;
    }
    setEnviando(true);

    const [caminhoResultado, localizacao] = await Promise.all([
      (async () => {
        const caminho = `${entidadeId}/${Date.now()}-entrada-${foto.name}`;
        const { error } = await supabase.storage.from("fotos-ponto").upload(caminho, foto);
        return error ? null : caminho;
      })(),
      obterLocalizacao(),
    ]);

    if (!caminhoResultado) {
      setEnviando(false);
      setErroEnvio("Não foi possível enviar a foto. Tente novamente.");
      return;
    }

    const { error } = await supabase.schema("JOVI").from(tabelaPonto).insert({
      [colunaId]: entidadeId,
      loja_id: lojaId,
      foto_entrada_url: caminhoResultado,
      latitude_entrada: localizacao?.lat ?? null,
      longitude_entrada: localizacao?.lng ?? null,
    });
    setEnviando(false);

    if (error) {
      setErroEnvio("Não foi possível registrar a entrada. Tente novamente.");
      return;
    }
    setSucesso("entrada");
  }

  async function handleRegistrarSaida() {
    if (!turnoAberto || !entidadeId) return;
    setErroEnvio("");
    if (!fotoSaida) {
      setErroEnvio("Tire a foto antes de registrar a saída.");
      return;
    }
    setEnviando(true);

    const [caminhoResultado, localizacao] = await Promise.all([
      (async () => {
        const caminho = `${entidadeId}/${Date.now()}-saida-${fotoSaida.name}`;
        const { error } = await supabase.storage.from("fotos-ponto").upload(caminho, fotoSaida);
        return error ? null : caminho;
      })(),
      obterLocalizacao(),
    ]);

    if (!caminhoResultado) {
      setEnviando(false);
      setErroEnvio("Não foi possível enviar a foto. Tente novamente.");
      return;
    }

    const { error } = await supabase
      .schema("JOVI")
      .from(tabelaPonto)
      .update({
        data_hora_saida: new Date().toISOString(),
        foto_saida_url: caminhoResultado,
        latitude_saida: localizacao?.lat ?? null,
        longitude_saida: localizacao?.lng ?? null,
      })
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

  // ---- turno aberto de um dia anterior: precisa justificar antes de continuar ----
  if (turnoAberto && !foiHoje(turnoAberto.data_hora_entrada)) {
    const lojaDoTurno = lojas.find((l) => l.id === turnoAberto.loja_id);
    return (
      <Shell>
        <Header title="Justificar ponto" backHref="/" />
        <div className="rounded-lg border p-5" style={{ borderColor: "#E8601C", background: "#FFF7F0" }}>
          <div className="text-center mb-5">
            <MessageSquareWarning size={28} className="mx-auto mb-3 text-[#E8601C]" />
            <p className="text-sm font-semibold text-[#0B1440]">A saída do dia anterior não foi registrada</p>
            <p className="text-xs text-[#6B7699] mt-1">
              Entrada em {lojaDoTurno?.LOJA || "loja"} às {new Date(turnoAberto.data_hora_entrada).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Horário real de saída *</label>
              <input
                type="time"
                value={horaJustificativa}
                onChange={(e) => setHoraJustificativa(e.target.value)}
                className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none text-[#0B1440]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Motivo *</label>
              <textarea
                value={motivoJustificativa}
                onChange={(e) => setMotivoJustificativa(e.target.value)}
                placeholder="Por que a saída não foi registrada na hora?"
                rows={3}
                className="w-full rounded-md border border-[#DCE1F5] bg-white py-2.5 px-3 text-sm outline-none resize-none text-[#0B1440]"
              />
            </div>

            {erroJustificativa && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroJustificativa}</div>}

            <button
              disabled={enviandoJustificativa}
              onClick={handleJustificarSaida}
              className="w-full rounded-md py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 bg-[#E8601C]"
            >
              {enviandoJustificativa && <Loader2 size={16} className="animate-spin" />}
              Justificar e continuar
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- turno já aberto: pede foto e confirma a saída ----
  if (turnoAberto) {
    const podeRegistrarSaida = !!fotoSaida;
    return (
      <Shell>
        <Header title="Registro de ponto" backHref="/" />
        <div className="rounded-lg border border-[#DCE1F5] bg-white p-5">
          <div className="text-center mb-5">
            <Clock size={28} className="mx-auto mb-3 text-[#1F8A70]" />
            <p className="text-sm text-[#6B7699] mb-1">Turno aberto desde</p>
            <p className="fonte-titulo text-lg font-bold text-[#0B1440]">
              {new Date(turnoAberto.data_hora_entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <label className="block text-xs font-semibold mb-2 text-[#0B1440]">Foto na saída</label>
          <label className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed py-8 px-2 cursor-pointer text-center mb-4" style={{ borderColor: previewFotoSaida ? "#1F8A70" : "#DCE1F5" }}>
            {previewFotoSaida ? (
              <img src={previewFotoSaida} alt="prévia" className="h-24 rounded-md object-cover" />
            ) : (
              <>
                <Camera size={22} className="text-[#6B7699]" />
                <span className="text-sm font-medium text-[#0B1440]">Tirar foto agora</span>
                <span className="text-[10px] text-[#6B7699]">a câmera abre direto — sem escolher da galeria</span>
              </>
            )}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFotoSaida} />
          </label>

          {erroEnvio && <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 mb-3 bg-red-50 text-red-700"><AlertCircle size={14} className="shrink-0 mt-0.5" />{erroEnvio}</div>}

          <button disabled={!podeRegistrarSaida || enviando} onClick={handleRegistrarSaida} className="w-full rounded-md py-3 text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: podeRegistrarSaida ? "#1E46E6" : "#DCE1F5" }}>
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
            <FixedSelect value={rede} onChange={(v) => { setRede(v); setUf(""); setCidade(""); selecionarLoja(""); }} options={redesDisponiveis} placeholder="Rede" icon={Building2} />
            {rede && <FixedSelect value={uf} onChange={(v) => { setUf(v); setCidade(""); selecionarLoja(""); }} options={ufsDisponiveis} placeholder="UF" icon={MapPin} />}
            {rede && uf && <FixedSelect value={cidade} onChange={(v) => { setCidade(v); selecionarLoja(""); }} options={cidadesDisponiveis} placeholder="Cidade" icon={MapPin} />}
            {rede && uf && cidade && <FixedSelect value={lojaNome} onChange={selecionarLoja} options={lojasDisponiveis} placeholder="Loja" icon={Store} />}
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
