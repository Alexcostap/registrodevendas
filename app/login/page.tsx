"use client";

import { useState } from "react";
import Script from "next/script";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

// Callback global que o widget do Turnstile chama quando o usuário
// resolve o desafio. Guardamos o token pra mandar junto no login.
declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
    turnstile?: any;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const supabase = createClient();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (typeof window !== "undefined") {
    window.onTurnstileSuccess = (token: string) => setCaptchaToken(token);
  }

  async function handleSubmit() {
    setError("");

    if (!email || !senha) {
      setError("Preencha e-mail e senha.");
      return;
    }
    if (turnstileSiteKey && !captchaToken) {
      setError("Resolva a verificação de segurança antes de continuar.");
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
      options: captchaToken ? { captchaToken } : undefined,
    });
    setLoading(false);

    if (authError) {
      setError("E-mail ou senha inválidos.");
      // reseta o captcha pra exigir nova resolução na próxima tentativa
      if (window.turnstile) window.turnstile.reset();
      setCaptchaToken(null);
      return;
    }

    window.location.href = "/";
  }

  return (
    <>
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      )}
      <div
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ background: "linear-gradient(160deg, #0B1440 0%, #142B8A 45%, #1E46E6 100%)" }}
      >
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6 px-1">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-white">
              <span className="font-bold text-[#1E46E6] text-sm">J</span>
            </div>
            <span className="text-[#DCE3FF] text-xs tracking-widest">JOVI · REGISTRO DE VENDAS</span>
          </div>

          <div className="rounded-xl p-7 bg-white shadow-xl">
            <h1 className="text-xl font-bold mb-1 text-[#0B1440]">Entrar</h1>
            <p className="text-sm mb-6 text-[#6B7699]">Use seu e-mail pessoal cadastrado e sua senha.</p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full rounded-md border border-[#DCE1F5] py-2.5 px-3 text-sm outline-none text-[#0B1440]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[#0B1440]">Senha</label>
                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-md border border-[#DCE1F5] py-2.5 pl-3 pr-10 text-sm outline-none text-[#0B1440]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7699]"
                  >
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {turnstileSiteKey && (
                <div
                  className="cf-turnstile"
                  data-sitekey={turnstileSiteKey}
                  data-callback="onTurnstileSuccess"
                />
              )}

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
                    <Loader2 size={16} className="animate-spin" /> Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-xs mt-5 text-[#B9C4F0]">
            Acesso restrito a promotores cadastrados.
          </p>
        </div>
      </div>
    </>
  );
}
