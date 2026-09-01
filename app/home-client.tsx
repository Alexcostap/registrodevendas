"use client";

import Link from "next/link";
import { PlusCircle, PackageSearch, LogOut, Clock, LogIn, CalendarClock } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type TurnoAberto = { id: number; data_hora_entrada: string; loja_id: number } | null;

export default function HomeClient({
  nome,
  ehPromotor,
  ehSupervisor,
  ehGestor,
  turnoAberto,
}: {
  nome: string;
  ehPromotor: boolean;
  ehSupervisor: boolean;
  ehGestor: boolean;
  turnoAberto: TurnoAberto;
}) {
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const horaEntrada = turnoAberto
    ? new Date(turnoAberto.data_hora_entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-screen w-full flex items-start justify-center p-6 bg-[#F4F6FC]">
      <div className="w-full max-w-sm mt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xs text-[#6B7699]">Olá,</div>
            <div className="text-xl font-bold text-[#0B1440]">{nome}</div>
          </div>
          <button onClick={handleLogout} aria-label="Sair">
            <LogOut size={18} className="text-[#6B7699]" />
          </button>
        </div>

        <Link
          href="/venda"
          className="w-full rounded-xl p-5 mb-4 flex items-center gap-4 bg-[#1E46E6] text-white"
        >
          <PlusCircle size={28} />
          <div>
            <div className="font-bold text-base">Inserir nova venda</div>
            <div className="text-xs opacity-80">Fotografe a nota e a caixa, registre em segundos</div>
          </div>
        </Link>

        <Link
          href="/estoque"
          className="w-full rounded-xl p-5 mb-4 flex items-center gap-4 border-2 border-[#1E46E6] bg-white text-[#0B1440]"
        >
          <PackageSearch size={28} className="text-[#1E46E6]" />
          <div>
            <div className="font-bold text-base">Atualizar estoque</div>
            <div className="text-xs text-[#6B7699]">Contagem rápida por loja</div>
          </div>
        </Link>

        {ehPromotor && (
          <Link
            href="/ponto"
            className="w-full rounded-xl p-5 flex items-center gap-4 text-white"
            style={{ background: turnoAberto ? "#1F8A70" : "#E8601C" }}
          >
            {turnoAberto ? <Clock size={28} /> : <LogIn size={28} />}
            <div>
              <div className="font-bold text-base">
                {turnoAberto ? "Registrar saída da loja" : "Registrar entrada da loja"}
              </div>
              <div className="text-xs opacity-90">
                {turnoAberto ? `Turno aberto desde ${horaEntrada}` : "Fotografe-se na chegada à loja"}
              </div>
            </div>
          </Link>
        )}

        {(ehSupervisor || ehGestor) && (
          <Link
            href="/escala"
            className="w-full rounded-xl p-5 flex items-center gap-4 border-2 border-[#1E46E6] bg-white text-[#0B1440]"
          >
            <CalendarClock size={28} className="text-[#1E46E6]" />
            <div>
              <div className="font-bold text-base">{ehGestor ? "Escala (todos os promotores)" : "Escala da equipe"}</div>
              <div className="text-xs text-[#6B7699]">Dia, horário e loja de cada promotor</div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
