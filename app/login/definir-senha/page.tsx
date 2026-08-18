"use client";

import { useState } from "react";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { maskPin } from "../../../lib/mascaras";

export default function DefinirSenhaPage() {
  const [pin, setPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (pin.length < 4) {
      setError("O PIN precisa ter pelo menos 4 números.");
      return;
    }
    if (pin !== confirmarPin) {
      setError("Os PINs não são iguais.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/definir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaSenha: pin }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || `Não foi possível salvar o PIN (erro ${response.status}).`);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6"
      style={{ background: "linear-gradient(160deg, #0B1440 0%, #142B8A 45%, #1E46E6 100%)" }}
    >
      <div className="w-full max-w-sm">
        <div className="rounded-xl p-7 bg-white shadow-xl">
          <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4 bg-[#1E46E6]">
            <ShieldCheck size={20} color="#FFFFFF" />
          </div>
          <h1 className="text-xl font-bold mb-1 text-[#0B1440]">Criar seu PIN</h1>
          <p className="text-sm mb-6 text-[#6B7699]">
            Escolha um PIN de pelo menos 4 números. É ele que você vai usar pra entrar daqui pra frente, junto com seu CPF.
          </p>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Novo PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(maskPin(e.target.value))}
                placeholder="••••••"
                className="w-full rounded-md border border-[#DCE1F5] py-2.5 px-3 text-sm outline-none text-[#0B1440]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Confirmar PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmarPin}
                onChange={(e) => setConfirmarPin(maskPin(e.target.value))}
                placeholder="••••••"
                className="w-full rounded-md border border-[#DCE1F5] py-2.5 px-3 text-sm outline-none text-[#0B1440]"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs rounded-md px-3 py-2 bg-red-50 text-red-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-md py-2.5 text-sm font-semibold flex items-center justify-center gap-2 bg-[#1E46E6] text-white disabled:opacity-75"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Salvando…
                </>
              ) : (
                "Salvar e entrar"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
