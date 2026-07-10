"use client";

import { useState } from "react";
import { Clapperboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(shouldCreateUser: boolean) {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-card text-accent">
          <Clapperboard size={28} />
        </div>
        <h1 className="text-lg font-bold">WatchList</h1>
      </div>

      <div className="mt-8 w-full max-w-xs">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresin"
          className="w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent/50"
        />

        {sent && (
          <p className="mt-3 text-center text-xs text-accent">
            Magic link {email} adresine gönderildi. Gelen kutunu kontrol et.
          </p>
        )}
        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}

        <button
          onClick={() => sendMagicLink(false)}
          disabled={loading}
          className="mt-4 w-full rounded-full bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          Giriş
        </button>
        <button
          onClick={() => sendMagicLink(true)}
          disabled={loading}
          className="mt-3 w-full rounded-full border border-white/20 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Kayıt Ol
        </button>
      </div>
    </div>
  );
}
