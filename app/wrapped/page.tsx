"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errorMessage";
import { fetchWatchLog } from "@/lib/fetchWatchLog";
import WrappedDeck from "@/components/WrappedDeck";
import WrappedTicket from "@/components/WrappedTicket";
import FilmStrip from "@/components/FilmStrip";
import {
  MONTH_NAMES,
  computeYearStats,
  estimateMinutes,
  formatDays,
  formatHours,
  formatLira,
  getAvailableYears,
  monthsElapsedInYear,
  type WatchLogEntry,
} from "@/lib/watchStats";
import type {
  ProgressStatus,
  Providers,
  StreamingPlatform,
  TitleType,
  WatchedProgress,
} from "@/lib/types";

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
  const [monthlySpend, setMonthlySpend] = useState(0);

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

        // Abonelik gideri: "bölüm başına kaç lira" biletini besliyor.
        const [{ data: profileRow }, { data: platformRows }] = await Promise.all([
          supabase.from("profiles").select("subscribed_platforms").eq("user_id", user.id).maybeSingle(),
          supabase.from("streaming_platforms").select("*"),
        ]);
        const subscribedIds: number[] = profileRow?.subscribed_platforms ?? [];
        const spend = ((platformRows ?? []) as StreamingPlatform[])
          .filter((p) => subscribedIds.includes(p.tmdb_provider_id))
          .reduce((sum, p) => sum + (p.monthly_price ?? 0), 0);
        setMonthlySpend(spend);

        // Günlük ayrı hata yönetiyor: geçmiş çekilemese bile kütüphane
        // özeti gösterilmeye devam etsin.
        try {
          const entries = await fetchWatchLog(supabase, user.id, LOG_LIMIT);
          setLog(entries);
          const years = getAvailableYears(entries);
          setSelectedYear(years[0] ?? new Date().getFullYear());
        } catch (err) {
          setLogError(errorMessage(err));
        }
      } catch (err) {
        setError(errorMessage(err));
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

  // --- Tüm zamanlar (user_progress) ---
  const completedSeries = rows.filter((r) => r.type === "tv" && r.status === "completed").length;
  const completedMovies = rows.filter((r) => r.type === "movie" && r.status === "completed").length;
  const libraryEpisodes = rows.reduce(
    (sum, r) => sum + Object.values(r.progress).reduce((s, eps) => s + eps.length, 0),
    0
  );
  const rated = rows.filter((r) => r.rating != null);
  const topRated = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  const avgRating = rated.length
    ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
    : null;

  // --- Seçili yıl (watch_events) ---
  const years = getAvailableYears(log);
  const year = selectedYear ?? new Date().getFullYear();
  const stats = computeYearStats(log, year);
  const totalWatched = stats.movieCount + stats.episodeCount;
  const minutes = estimateMinutes(stats);

  const months = monthsElapsedInYear(year);
  const yearSpend = monthlySpend * months;
  const costPerWatch = totalWatched > 0 ? yearSpend / totalWatched : null;

  const providerCounts = new Map<string, number>();
  rows.forEach((r) => {
    (r.providers.flatrate ?? []).forEach((p) => {
      providerCounts.set(p.provider_name, (providerCounts.get(p.provider_name) ?? 0) + 1);
    });
  });
  const topProvider = [...providerCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Bilet numarası ("02 / 05") ancak listenin tamamı bilinince yazılabildiği
  // için biletler önce render fonksiyonu olarak toplanıp sonra çiziliyor.
  type TicketRenderer = (index: number, total: number) => React.ReactNode;
  const ticketRenderers: TicketRenderer[] = [];

  if (totalWatched > 0) {
    ticketRenderers.push((i, t) => (
      <WrappedTicket eyebrow="Seans" index={i} total={t}>
        <p className="text-xs text-white/40">{year} yılında koltuğa gömüldün</p>
        <p className="mt-3 font-display text-[5.5rem] leading-[0.85] tracking-wide text-[#ffd9a0]">
          {formatHours(minutes)}
        </p>
        <p className="font-display text-2xl tracking-[0.2em] text-accent">SAAT</p>
        <p className="mt-4 text-xs leading-relaxed text-white/40">
          Yaklaşık {formatDays(minutes)} gün. {stats.episodeCount} bölüm ve {stats.movieCount} film,
          ortalama sürelerle hesaplandı.
        </p>
      </WrappedTicket>
    ));

    ticketRenderers.push((i, t) => (
      <WrappedTicket eyebrow="Salon" index={i} total={t}>
        <div className="flex flex-col gap-4">
          <CountRow value={stats.episodeCount} label="Bölüm" />
          <CountRow value={stats.movieCount} label="Film" />
          <CountRow value={stats.seriesCount} label="Farklı dizi" />
        </div>
      </WrappedTicket>
    ));

    ticketRenderers.push((i, t) => (
      <WrappedTicket eyebrow="Yılın ritmi" index={i} total={t}>
        <FilmStrip counts={stats.monthlyCounts} />
        {stats.busiestMonth && stats.busiestMonth.count > 0 && (
          <p className="mt-5 text-sm leading-relaxed text-white/60">
            En çok{" "}
            <span className="font-display text-xl tracking-wide text-accent">
              {MONTH_NAMES[stats.busiestMonth.month]}
            </span>{" "}
            ayında izledin — {stats.busiestMonth.count} kayıt.
          </p>
        )}
      </WrappedTicket>
    ));

    // İmza bilet: abonelik gideri ile izlenen içeriğin oranı.
    if (costPerWatch != null && yearSpend > 0) {
      const pricey = costPerWatch > 25;
      ticketRenderers.push((i, t) => (
        <WrappedTicket eyebrow="Hesap" index={i} total={t} tone={pricey ? "alarm" : "default"}>
          <p className="text-xs text-white/40">İzlediğin her şeyin bilet fiyatı</p>
          <p
            className={`mt-3 font-display text-[4.5rem] leading-[0.85] tracking-wide ${
              pricey ? "text-[#e8674f]" : "text-[#ffd9a0]"
            }`}
          >
            {formatLira(costPerWatch)}
          </p>
          <p className="font-display text-xl tracking-[0.15em] text-accent">İZLEME BAŞINA</p>
          <p className="mt-4 text-xs leading-relaxed text-white/40">
            {months} ayda {formatLira(yearSpend, 0)} abonelik ödedin, {totalWatched} şey izledin.
            Güncel abonelik fiyatlarına göre.
          </p>
        </WrappedTicket>
      ));
    }

    if (stats.rewatchCount > 0) {
      ticketRenderers.push((i, t) => (
        <WrappedTicket eyebrow="Tekrar" index={i} total={t}>
          <p className="font-display text-[5rem] leading-[0.85] tracking-wide text-[#ffd9a0]">
            {stats.rewatchCount}
          </p>
          <p className="font-display text-xl tracking-[0.15em] text-accent">KEZ GERİ DÖNDÜN</p>
          <p className="mt-4 text-xs leading-relaxed text-white/40">
            Daha önce izlediğin bir şeyi tekrar açtın. Bazı şeyler bir kez yetmiyor.
          </p>
        </WrappedTicket>
      ));
    }

    if (topRated || topProvider) {
      ticketRenderers.push((i, t) => (
        <WrappedTicket eyebrow="Koçan" index={i} total={t}>
          <div className="flex flex-col gap-5">
            {topRated && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  En yüksek puanın
                </p>
                <p className="mt-1 font-display text-3xl leading-tight tracking-wide text-[#ffd9a0]">
                  {topRated.title}
                </p>
                <p className="text-sm text-accent">
                  {"★".repeat(topRated.rating ?? 0)}
                  <span className="text-white/15">{"★".repeat(5 - (topRated.rating ?? 0))}</span>
                </p>
              </div>
            )}
            {topProvider && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  En çok kullandığın platform
                </p>
                <p className="mt-1 font-display text-2xl tracking-wide text-white/80">
                  {topProvider[0]}
                </p>
                <p className="text-xs text-white/40">{topProvider[1]} başlık</p>
              </div>
            )}
          </div>
        </WrappedTicket>
      ));
    }
  }

  const renderedTickets = ticketRenderers.map((render, i) => (
    <div key={i} className="h-full">
      {render(i, ticketRenderers.length)}
    </div>
  ));

  return (
    <main className="px-4 pb-16 pt-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-sm">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">
            İzleme Özetin
          </p>
          <div className="mt-1 flex items-center justify-center gap-3">
            <h1 className="font-display text-5xl tracking-wide text-accent">{year}</h1>
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
        </header>

        <div className="mt-6">
          {logError ? (
            <div className="rounded-2xl border border-white/10 bg-card p-5 text-center">
              <p className="text-sm text-red-400">Geçmiş yüklenemedi.</p>
              <p className="mt-1 break-words text-xs text-white/40">{logError}</p>
            </div>
          ) : renderedTickets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-card p-6 text-center">
              <p className="text-sm text-white/60">{year} için henüz bilet kesilmedi.</p>
              <p className="mt-2 text-xs leading-relaxed text-white/40">
                Bir bölümü veya filmi izlendi işaretlediğinde tarihiyle kaydedilir ve özetin
                buradan birikmeye başlar.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/25"
              >
                İçerik bul
              </Link>
            </div>
          ) : (
            <WrappedDeck tickets={renderedTickets} />
          )}
        </div>

        <Link
          href="/gunluk"
          className="mt-6 flex items-center justify-center rounded-xl border border-white/10 py-2.5 text-xs font-medium text-white/70 transition hover:border-white/25"
        >
          Seyir günlüğünü aç
        </Link>

        {/* Tüm zamanlar: kaynağı user_progress, geçmiş kaydı öncesini de kapsar */}
        <section className="mt-10 border-t border-white/5 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Tüm zamanlar
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <AllTimeRow label="Bitirdiğin dizi" value={completedSeries} />
            <AllTimeRow label="İzlediğin film" value={completedMovies} />
            <AllTimeRow label="Toplam bölüm" value={libraryEpisodes} />
            {avgRating != null && (
              <AllTimeRow label="Ortalama puanın" value={`★ ${avgRating.toFixed(1)}`} />
            )}
          </dl>
        </section>
      </div>
    </main>
  );
}

function CountRow({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-white/5 pb-3 last:border-0">
      <span className="font-display text-5xl leading-none tracking-wide text-[#ffd9a0]">
        {value}
      </span>
      <span className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</span>
    </div>
  );
}

function AllTimeRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[11px] text-white/40">{label}</dt>
      <dd className="font-display text-2xl tracking-wide text-accent">{value}</dd>
    </div>
  );
}
