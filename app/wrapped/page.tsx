"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchWatchLog } from "@/lib/fetchWatchLog";
import {
  MONTH_NAMES,
  computeYearStats,
  getAvailableYears,
  type WatchLogEntry,
} from "@/lib/watchStats";
import type { ProgressStatus, Providers, TitleType, WatchedProgress } from "@/lib/types";

// Günlük büyüdükçe tamamını çekmek anlamsızlaşır; yıllık özet için
// son birkaç yılı kapsayacak kadarı yeterli.
const LOG_LIMIT = 2000;

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
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [log, setLog] = useState<WatchLogEntry[]>([]);
  const [logError, setLogError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        setEmail(user.email ?? null);

        const { data, error: progressError } = await supabase
          .from("user_progress")
          .select("tmdb_id, status, progress, rating, titles(title, type, providers)")
          .eq("user_id", user.id);
        if (progressError) throw progressError;

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

        // Günlük ayrı hata yönetiyor: geçmiş çekilemese bile kütüphane
        // özeti gösterilmeye devam etsin.
        try {
          const entries = await fetchWatchLog(supabase, user.id, LOG_LIMIT);
          setLog(entries);
          const years = getAvailableYears(entries);
          setSelectedYear(years[0] ?? new Date().getFullYear());
        } catch (err) {
          setLogError(err instanceof Error ? err.message : "Geçmiş yüklenemedi");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Beklenmedik bir hata oluştu");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  if (loading) {
    return <p className="p-6 text-center text-sm text-white/40">Yükleniyor...</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-sm text-red-400">Özet yüklenemedi. {error}</p>;
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-white/50">Özetini görmek için giriş yap.</p>
        <Link
          href="/login"
          className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-black"
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

  const years = getAvailableYears(log);
  const year = selectedYear ?? new Date().getFullYear();
  const yearStats = computeYearStats(log, year);
  const hasYearData = yearStats.movieCount + yearStats.episodeCount > 0;

  return (
    <main className="px-4 pb-16 pt-10 md:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            İzleme Özetin
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-wide text-accent">WatchList</h1>
        </div>

        {/* Yıl bazlı bölüm: kaynağı watch_events (gerçek izleme tarihleri) */}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3 border-b border-accent/20 pb-2">
            <h2 className="font-display text-2xl tracking-wide text-accent">{year} Yılın</h2>
            {years.length > 1 && (
              <select
                value={year}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-card px-2 py-1 text-xs text-white/70 outline-none"
                aria-label="Yıl seç"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>

          {logError ? (
            <p className="mt-3 text-xs text-red-400">Geçmiş yüklenemedi. {logError}</p>
          ) : !hasYearData ? (
            <p className="mt-3 text-xs text-white/40">
              {year} için henüz kayıt yok. İzleme geçmişi, bir bölümü veya filmi izlendi
              işaretlediğinde tarihiyle birlikte kaydedilmeye başlar.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <MiniStat value={yearStats.movieCount} label="Film" />
                <MiniStat value={yearStats.episodeCount} label="Bölüm" />
                <MiniStat value={yearStats.seriesCount} label="Dizi" />
              </div>

              <MonthlyChart counts={yearStats.monthlyCounts} />

              {yearStats.busiestMonth && yearStats.busiestMonth.count > 0 && (
                <p className="text-center text-xs text-white/50">
                  En yoğun ayın{" "}
                  <span className="font-semibold text-accent">
                    {MONTH_NAMES[yearStats.busiestMonth.month]}
                  </span>{" "}
                  — {yearStats.busiestMonth.count} kayıt
                </p>
              )}

              {yearStats.rewatchCount > 0 && (
                <p className="text-center text-xs text-white/50">
                  <span className="font-semibold text-accent">{yearStats.rewatchCount}</span> kez
                  daha önce izlediğin bir şeye geri döndün
                </p>
              )}
            </div>
          )}

          <Link
            href="/gunluk"
            className="mt-4 flex items-center justify-center rounded-xl border border-white/10 py-2 text-xs font-medium text-white/70 transition hover:border-white/25"
          >
            Seyir günlüğünü aç
          </Link>
        </section>

        {/* Kütüphane geneli: kaynağı user_progress (tüm zamanlar) */}
        <section className="mt-10">
          <div className="border-b border-accent/20 pb-2">
            <h2 className="font-display text-2xl tracking-wide text-accent">Kütüphanen</h2>
          </div>

          {!hasAnyData ? (
            <p className="mt-4 text-center text-sm text-white/50">
              Henüz özet çıkaracak kadar veri yok — birkaç başlık işaretle, sonra buraya dön.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4 text-center">
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
                <div className="rounded-2xl border border-accent/20 bg-card p-4 text-left">
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
        </section>

        <p className="mt-10 text-center text-xs text-white/30">
          Ekran görüntüsü alıp paylaşabilirsin.
        </p>
      </div>
    </main>
  );
}

function MonthlyChart({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);

  return (
    <div className="rounded-2xl border border-white/5 bg-card p-4">
      <p className="mb-3 text-xs font-semibold text-white/50">Aylara göre</p>
      <div className="flex items-end gap-1">
        {counts.map((count, month) => (
          <div key={month} className="flex flex-1 flex-col items-center gap-1">
            {/* Yüzde yükseklik çözülebilsin diye çubuk sabit yükseklikli bir kutuya sarılı */}
            <div className="flex h-20 w-full items-end">
              <div
                className={`w-full rounded-t-sm ${count > 0 ? "bg-accent/70" : "bg-white/5"}`}
                style={{ height: `${count > 0 ? Math.max((count / max) * 100, 6) : 3}%` }}
                title={`${MONTH_NAMES[month]}: ${count}`}
              />
            </div>
            <span className="text-[9px] text-white/30">{MONTH_NAMES[month].slice(0, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-card p-3 text-center">
      <p className="font-display text-3xl tracking-wide text-accent">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/50">{label}</p>
    </div>
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
