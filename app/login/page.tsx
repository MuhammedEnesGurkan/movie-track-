"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function translateError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "E-posta veya şifre hatalı";
  if (lower.includes("user already registered"))
    return "Bu e-posta zaten kayıtlı, giriş yapmayı dene";
  if (lower.includes("rate limit"))
    return "Çok fazla deneme yapıldı, birkaç dakika sonra tekrar dene";
  return "Bir şeyler ters gitti, tekrar dene";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  function validate(): string | null {
    if (!EMAIL_REGEX.test(email.trim())) return "Geçerli bir e-posta adresi gir";
    if (password.length < 6) return "Şifre en az 6 karakter olmalı";
    if (mode === "signup" && password !== confirmPassword) return "Şifreler eşleşmiyor";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (error) {
        setError(translateError(error.message));
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({ user_id: data.user.id });
    }

    router.push("/onboarding");
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Şifremi sıfırlamak için önce geçerli bir e-posta gir");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
      return;
    }
    setResetSent(true);
  }

  function toggleMode() {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError(null);
    setResetSent(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-card text-accent">
          <Clapperboard size={28} />
        </div>
        <h1 className="text-lg font-bold">WatchList</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xs">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresin"
          className="w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent/50"
        />

        <div className="relative mt-3">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            className="w-full rounded-xl border border-white/10 bg-card px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {mode === "signup" && (
          <div className="relative mt-3">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifre (tekrar)"
              className="w-full rounded-xl border border-white/10 bg-card px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent/50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}

        {mode === "login" && (
          <button
            type="button"
            onClick={handleForgotPassword}
            className="mt-2 text-xs text-white/40 underline"
          >
            Şifremi unuttum
          </button>
        )}

        {resetSent && (
          <p className="mt-3 text-center text-xs text-accent">
            E-posta adresine sıfırlama bağlantısı gönderildi.
          </p>
        )}
        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {mode === "login" ? "Giriş" : "Kayıt Ol"}
        </button>

        <button
          type="button"
          onClick={toggleMode}
          className="mt-4 w-full text-center text-xs text-white/50"
        >
          {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten üye misin? Giriş yap"}
        </button>
      </form>
    </div>
  );
}
