"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { maskCPF, maskData, somenteDigitos } from "../../../lib/mascaras";

export default function PrimeiroAcessoPage() {
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const cpfDigitos = somenteDigitos(cpf);
    const nascimentoDigitos = somenteDigitos(nascimento);

    if (cpfDigitos.length !== 11 || nascimentoDigitos.length !== 8) {
      setError("Preencha CPF e data de nascimento completos.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verificar-identidade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpfDigitos, nascimento: nascimentoDigitos }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || `Não foi possível verificar seus dados (erro ${response.status}).`);
        return;
      }

      window.location.href = "/login/definir-senha";
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
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-[#6B7699] mb-4">
            <ArrowLeft size={14} /> voltar
          </Link>
          <h1 className="text-xl font-bold mb-1 text-[#0B1440]">Verificar identidade</h1>
          <p className="text-sm mb-6 text-[#6B7699]">
            Confirme seu CPF e data de nascimento (os mesmos do seu cadastro).
          </p>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">CPF</label>
              <input
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(maskCPF(cpf, e.target.value))}
                placeholder="000.000.000-00"
                className="w-full rounded-md border border-[#DCE1F5] py-2.5 px-3 text-sm outline-none text-[#0B1440]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Data de nascimento</label>
              <input
                type="text"
                inputMode="numeric"
                value={nascimento}
                onChange={(e) => setNascimento(maskData(nascimento, e.target.value))}
                placeholder="00/00/0000"
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
                  <Loader2 size={16} className="animate-spin" /> Verificando…
                </>
              ) : (
                "Continuar"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
