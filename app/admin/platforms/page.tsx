"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StreamingPlatform } from "@/lib/types";

const EMPTY_DRAFT = { tmdb_provider_id: "", name: "", logo_path: "", monthly_price: "", currency: "TRY" };

export default function AdminPlatformsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [rows, setRows] = useState<StreamingPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/admin/platforms");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const { platforms } = await res.json();
    setRows(platforms ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateField(id: string, field: keyof StreamingPlatform, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function saveRow(row: StreamingPlatform) {
    await fetch("/api/admin/platforms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        name: row.name,
        logo_path: row.logo_path,
        monthly_price: row.monthly_price,
        currency: row.currency,
      }),
    });
    load();
  }

  async function deleteRow(id: string) {
    await fetch(`/api/admin/platforms?id=${id}`, { method: "DELETE" });
    load();
  }

  async function addPlatform() {
    if (!draft.tmdb_provider_id || !draft.name) return;
    await fetch("/api/admin/platforms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setDraft(EMPTY_DRAFT);
    load();
  }

  if (loading) {
    return <p className="p-6 text-center text-sm text-white/40">Yükleniyor...</p>;
  }

  if (forbidden) {
    return (
      <main className="px-4 pt-6 md:px-6 lg:px-8">
        <h1 className="font-display text-3xl tracking-wide text-accent">Erişim yok</h1>
        <p className="mt-2 text-sm text-white/50">Bu sayfa yalnızca yöneticiler içindir.</p>
      </main>
    );
  }

  return (
    <main className="px-4 pt-6 md:px-6 lg:px-8">
      <h1 className="font-display text-3xl tracking-wide text-accent">Platform Yönetimi</h1>
      <p className="mt-1 text-sm text-white/50">
        Buradaki fiyatlar TMDB'den değil bu tablodan gelir. Zam geldiğinde tek satırı güncellemek yeterli.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-card p-3 md:grid-cols-6 md:items-center">
            <input
              value={row.name}
              onChange={(e) => updateField(row.id, "name", e.target.value)}
              className="rounded-lg border border-white/10 bg-bg px-2 py-1.5 text-sm outline-none"
              placeholder="Platform adı"
            />
            <input
              value={row.logo_path ?? ""}
              onChange={(e) => updateField(row.id, "logo_path", e.target.value)}
              className="rounded-lg border border-white/10 bg-bg px-2 py-1.5 text-sm outline-none"
              placeholder="Logo URL / TMDB path"
            />
            <input
              value={row.monthly_price ?? ""}
              onChange={(e) => updateField(row.id, "monthly_price", e.target.value)}
              className="rounded-lg border border-white/10 bg-bg px-2 py-1.5 text-sm outline-none"
              placeholder="Aylık fiyat"
              inputMode="decimal"
            />
            <input
              value={row.currency}
              onChange={(e) => updateField(row.id, "currency", e.target.value)}
              className="rounded-lg border border-white/10 bg-bg px-2 py-1.5 text-sm outline-none"
              placeholder="Para birimi"
            />
            <span className="truncate text-xs text-white/40">
              {new Date(row.updated_at).toLocaleString("tr-TR")}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => saveRow(row)}
                className="flex-1 rounded-lg bg-accent py-1.5 text-xs font-semibold text-black"
              >
                Kaydet
              </button>
              <button
                onClick={() => deleteRow(row.id)}
                className="flex-1 rounded-lg border border-red-500/40 py-1.5 text-xs text-red-400"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-xl tracking-wide text-accent">Yeni Platform Ekle</h2>
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-card p-3 md:grid-cols-5">
        <input
          value={draft.tmdb_provider_id}
          onChange={(e) => setDraft({ ...draft, tmdb_provider_id: e.target.value })}
          className="rounded-lg border border-white/10 bg-bg px-2 py-1.5 text-sm outline-none"
          placeholder="TMDB provider_id"
          inputMode="numeric"
        />
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="rounded-lg border border-white/10 bg-bg px-2 py-1.5 text-sm outline-none"
          placeholder="Platform adı"
        />
        <input
          value={draft.logo_path}
          onChange={(e) => setDraft({ ...draft, logo_path: e.target.value })}
          className="rounded-lg border border-white/10 bg-bg px-2 py-1.5 text-sm outline-none"
          placeholder="Logo URL"
        />
        <input
          value={draft.monthly_price}
          onChange={(e) => setDraft({ ...draft, monthly_price: e.target.value })}
          className="rounded-lg border border-white/10 bg-bg px-2 py-1.5 text-sm outline-none"
          placeholder="Aylık fiyat"
          inputMode="decimal"
        />
        <button onClick={addPlatform} className="rounded-lg bg-accent py-1.5 text-sm font-semibold text-black">
          Ekle
        </button>
      </div>
    </main>
  );
}
