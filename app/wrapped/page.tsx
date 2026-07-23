"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ProgressStatus, Providers, TitleType, WatchedProgress } from "@/lib/types";

type Row = {
  tmdb_id: number;
  status: ProgressStatus;
  progress: WatchedProgress;
  rating: number | null;
  title: string;
  type: TitleType;
  providers: Providers;
};

export default function WrappedPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email ?? null);

      const { data } = await supabase
        .from("user_progress")
        .select("tmdb_id, status, progress, rating, titles(title, type, providers)")
        .eq("user_id", user.id);

      setRows(
        (data ?? []).map((r: any) => ({
          tmdb_id: r.tmdb_id,
          status: r.status,
          progress: r.progress ?? {},
          rating: r.rating ?? null,
          title: r.titles?.title ?? "",
          type: r.titles?.type ?? "tv",
          providers: r.titles?.providers ?? {},
        }))
      );
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="p-6 text-center text-sm text-white/40">Yükleniyor...</p>;
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-white/50">Özetini görmek için giriş yap.</p>
        <Link
          href="/login"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  const completedSeries = rows.filter((r) => r.type === "tv" && r.status === "completed").length;
  const completedMovies = rows.filter((r) => r.type === "movie" && r.status === "completed").length;
  const episodeCount = rows.reduce(
    (sum, r) => sum + Object.values(r.progress).reduce((s, eps) => s + eps.length, 0),
    0
  );

  const rated = rows.filter((r) => r.rating != null);
  const avgRating = rated.length
    ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
    : null;
  const topRated = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3);

  const providerCounts = new Map<string, number>();
  rows.forEach((r) => {
    (r.providers.flatrate ?? []).forEach((p) => {
      providerCounts.set(p.provider_name, (providerCounts.get(p.provider_name) ?? 0) + 1);
    });
  });
  const topProvider = [...providerCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const hasAnyData = completedSeries + completedMovies + episodeCount > 0;

  return (
    <main className="px-4 pb-16 pt-10 md:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
          İzleme Özetin
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-wide text-accent">WatchList</h1>

        {!hasAnyData ? (
          <p className="mt-10 text-sm text-white/50">
            Henüz özet çıkaracak kadar veri yok — birkaç başlık işaretle, sonra buraya dön.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            <StatCard value={completedSeries} label="Bitirdiğin dizi" />
            <StatCard value={completedMovies} label="İzlediğin film" />
            <StatCard value={episodeCount} label="Toplam bölüm" />
            {topProvider && (
              <StatCard
                value={topProvider[0]}
                label={`En çok kullandığın platform (${topProvider[1]} başlık)`}
                isText
              />
            )}
            {avgRating != null && (
              <StatCard value={`⭐ ${avgRating.toFixed(1)}`} label="Ortalama puanın" isText />
            )}

            {topRated.length > 0 && (
              <div className="mt-2 rounded-2xl border border-accent/20 bg-card p-4 text-left">
                <p className="mb-2 text-xs font-semibold text-white/50">
                  En yüksek puan verdiklerin
                </p>
                <ul className="flex flex-col gap-1">
                  {topRated.map((r) => (
                    <li key={r.tmdb_id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{r.title}</span>
                      <span className="ml-2 shrink-0 text-accent">⭐ {r.rating}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="mt-10 text-xs text-white/30">Ekran görüntüsü alıp paylaşabilirsin.</p>
      </div>
    </main>
  );
}

function StatCard({
  value,
  label,
  isText,
}: {
  value: number | string;
  label: string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-card p-6">
      <p className={`font-display tracking-wide text-accent ${isText ? "text-2xl" : "text-5xl"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}
