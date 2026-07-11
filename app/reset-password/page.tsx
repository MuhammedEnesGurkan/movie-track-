"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
      return;
    }
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Bir şeyler ters gitti, tekrar dene");
      return;
    }
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="text-lg font-bold">Yeni Şifre Belirle</h1>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xs">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Yeni şifre"
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

        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Yeni şifre (tekrar)"
          className="mt-3 w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent/50"
        />

        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Şifreyi Güncelle
        </button>
      </form>
    </div>
  );
}
