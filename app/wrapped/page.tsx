"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errorMessage";
import { fetchWatchLog } from "@/lib/fetchWatchLog";
import Scene, { tintInk } from "@/components/wrapped/Scene";
import PosterWall from "@/components/wrapped/PosterWall";
import {
  MONTH_NAMES,
  computeYearStats,
  estimateMinutes,
  formatDays,
  formatHours,
  formatLira,
  getAvailableYears,
  getYearPosters,
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

const TMDB_IMG = "https://image.tmdb.org/t/p";
const LOG_LIMIT = 2000;

type Row = {
  tmdb_id: number;
  status: ProgressStatus;
  progress: WatchedProgress;
  rating: number | null;
  title: string;
  type: TitleType;
  providers: Providers;
  poster_path: string | null;
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
          .select("tmdb_id, status, progress, rating, titles(title, type, providers, poster_path)")
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
            poster_path: r.titles?.poster_path ?? null,
          }))
        );

        const [{ data: profileRow }, { data: platformRows }] = await Promise.all([
          supabase.from("profiles").select("subscribed_platforms").eq("user_id", user.id).maybeSingle(),
          supabase.from("streaming_platforms").select("*"),
        ]);
        const subscribedIds: number[] = profileRow?.subscribed_platforms ?? [];
        setMonthlySpend(
          ((platformRows ?? []) as StreamingPlatform[])
            .filter((p) => subscribedIds.includes(p.tmdb_provider_id))
            .reduce((sum, p) => sum + (p.monthly_price ?? 0), 0)
        );

        try {
          const entries = await fetchWatchLog(supabase, user.id, LOG_LIMIT);
          setLog(entries);
          setSelectedYear(getAvailableYears(entries)[0] ?? new Date().getFullYear());
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
        <Link href="/login" className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-black">
          Giriş Yap
        </Link>
      </div>
    );
  }

  const years = getAvailableYears(log);
  const year = selectedYear ?? new Date().getFullYear();
  const stats = computeYearStats(log, year);
  const totalWatched = stats.movieCount + stats.episodeCount;
  const hasYearData = totalWatched > 0;
  const minutes = estimateMinutes(stats);

  const months = monthsElapsedInYear(year);
  const yearSpend = monthlySpend * months;
  const costPerWatch = hasYearData ? yearSpend / totalWatched : null;

  // Tüm zamanlar (user_progress). Geçmiş kaydı (watch_events) yalnızca
  // eklendiği günden beri dolduğu için, ondan önceki kütüphane burada durur;
  // yıl verisi olmasa bile özetin gösterecek bir şeyi olsun.
  const librarySeries = rows.filter((r) => r.type === "tv" && r.status === "completed").length;
  const libraryMovies = rows.filter((r) => r.type === "movie" && r.status === "completed").length;
  const libraryEpisodes = rows.reduce(
    (sum, r) => sum + Object.values(r.progress).reduce((s, eps) => s + eps.length, 0),
    0
  );
  const hasLibrary = librarySeries + libraryMovies + libraryEpisodes > 0;

  const rated = rows.filter((r) => r.rating != null);
  const topRated = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

  // Poster duvarı önce yılın izlediklerinden beslenir; yıl boşsa kütüphaneye düşer.
  const yearPosters = getYearPosters(log, year, 12);
  const libraryPosters = rows
    .filter((r) => r.poster_path)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 12)
    .map((r) => ({
      key: `${r.type}-${r.tmdb_id}`,
      posterPath: r.poster_path as string,
      title: r.title,
    }));
  const posters = yearPosters.length > 0 ? yearPosters : libraryPosters;

  const providerCounts = new Map<string, number>();
  rows.forEach((r) =>
    (r.providers.flatrate ?? []).forEach((p) =>
      providerCounts.set(p.provider_name, (providerCounts.get(p.provider_name) ?? 0) + 1)
    )
  );
  const topProvider = [...providerCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const shell =
    "no-scrollbar -mb-20 h-[calc(100svh-4rem)] snap-y snap-mandatory overflow-y-auto lg:-mb-6 lg:h-[100svh]";

  if (logError) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-400">Geçmiş yüklenemedi.</p>
        <p className="mx-auto mt-2 max-w-sm break-words text-xs text-white/40">{logError}</p>
      </div>
    );
  }

  // Ne yıl kaydı ne de kütüphane varsa gösterilecek bir şey yok.
  if (!hasYearData && !hasLibrary) {
    return (
      <main className={shell}>
        <Scene tint="amber" slug="Perde">
          <p className="font-display text-[clamp(4rem,20vw,7rem)] leading-[0.85] tracking-wide text-accent">
            {year}
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            Perde henüz açılmadı. Bir bölümü izlendi işaretlediğin an kayıt başlar ve özetin
            buradan oluşur.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl border border-white/15 px-5 py-2.5 text-xs font-medium text-white/70 transition hover:border-white/30"
          >
            İçerik bul
          </Link>
        </Scene>
      </main>
    );
  }

  return (
    <main className={shell}>
      {/* 1 — Perde: yılın posterleri ışığın arkasında */}
      <Scene tint="amber" slug="Perde" backdrop={<PosterWall posters={posters} />}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
          Yılın Seansları
        </p>
        <h1 className="font-display text-[clamp(6rem,32vw,12rem)] leading-[0.78] tracking-wide text-accent">
          {year}
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-white/55">
          {hasYearData
            ? "Bu yıl neyi, ne zaman, kaç kez izlediğini kaydettin. Işıkları kısıp aşağı kaydır."
            : "Bu yılın günlüğü henüz boş — ama kütüphanen dolu. Işıkları kısıp aşağı kaydır."}
        </p>
        <div className="mt-8 flex items-center gap-4">
          <ChevronDown size={18} className="animate-bounce text-accent/70" />
          {years.length > 1 && (
            <select
              value={year}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white/70 outline-none"
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
      </Scene>

      {/* Yıl sahneleri yalnızca o yıla ait günlük kaydı varsa oynar. */}
      {hasYearData && (
        <>
      {/* 2 — Süre: tek dev rakam */}
      <Scene tint="gece" slug="Süre">
        <p className="text-sm text-white/50">Perde başında geçirdiğin süre</p>
        <p
          className="font-display text-[clamp(6rem,34vw,13rem)] leading-[0.75] tracking-wide"
          style={{ color: tintInk("gece") }}
        >
          {formatHours(minutes)}
        </p>
        <p className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-none tracking-[0.2em] text-white/80">
          SAAT
        </p>
        <p className="mt-6 max-w-xs text-xs leading-relaxed text-white/40">
          Yaklaşık {formatDays(minutes)} gün kesintisiz. {stats.episodeCount} bölüm ve{" "}
          {stats.movieCount} film üzerinden, ortalama sürelerle.
        </p>
      </Scene>

      {/* 3 — Sayım: kademeli, diyagonal yerleşim */}
      <Scene tint="mor" slug="Sayım">
        <div className="flex flex-col gap-7">
          <BigCount value={stats.episodeCount} label="bölüm" tint="mor" align="start" />
          <BigCount value={stats.movieCount} label="film" tint="mor" align="center" />
          <BigCount value={stats.seriesCount} label="farklı dizi" tint="mor" align="end" />
        </div>
      </Scene>

      {/* 4 — Ritim: yılın ayları dikey ışık çubukları olarak */}
      <Scene tint="bordo" slug="Ritim">
        <p className="text-sm text-white/50">Yılın nasıl geçti</p>
        <div className="mt-6 flex h-44 items-end gap-1.5">
          {stats.monthlyCounts.map((count, month) => {
            const max = Math.max(...stats.monthlyCounts, 1);
            const isPeak = stats.busiestMonth?.month === month && count > 0;
            return (
              <div key={month} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${count > 0 ? Math.max((count / max) * 100, 4) : 2}%`,
                      backgroundColor: isPeak ? tintInk("bordo") : "rgb(255 255 255 / 0.16)",
                      boxShadow: isPeak ? `0 0 22px ${tintInk("bordo")}` : undefined,
                    }}
                  />
                </div>
                <span
                  className={`text-[9px] ${isPeak ? "text-white/70" : "text-white/25"}`}
                >
                  {MONTH_NAMES[month].slice(0, 1)}
                </span>
              </div>
            );
          })}
        </div>
        {stats.busiestMonth && stats.busiestMonth.count > 0 && (
          <p className="mt-6 max-w-xs text-lg leading-snug text-white/70">
            En çok{" "}
            <span
              className="font-display text-3xl tracking-wide"
              style={{ color: tintInk("bordo") }}
            >
              {MONTH_NAMES[stats.busiestMonth.month]}
            </span>{" "}
            ayında izledin.
          </p>
        )}
      </Scene>

      {/* 5 — Hesap: bu uygulamaya özgü istatistik */}
      {costPerWatch != null && yearSpend > 0 && (
        <Scene tint="mercan" slug="Hesap">
          <p className="text-sm text-white/50">İzlediğin her şeyin bilet fiyatı</p>
          <p
            className="font-display text-[clamp(5rem,26vw,10rem)] leading-[0.78] tracking-wide"
            style={{ color: tintInk("mercan") }}
          >
            {formatLira(costPerWatch)}
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-white/55">
            {months} ayda {formatLira(yearSpend, 0)} abonelik ödedin, karşılığında {totalWatched}{" "}
            şey izledin.
          </p>
          <p className="mt-4 text-[11px] text-white/30">Güncel abonelik fiyatlarına göre.</p>
        </Scene>
      )}
        </>
      )}

      {/* 6 — Kütüphanen: tüm zamanlar, günlük kaydından önceki geçmiş dahil */}
      {hasLibrary && (
        <Scene tint="gece" slug="Kütüphane">
          <p className="text-sm text-white/50">Kütüphanende biriken</p>
          <div className="mt-6 flex flex-col gap-5">
            <LibraryLine value={libraryEpisodes} label="bölüm" />
            <LibraryLine value={librarySeries} label="bitirdiğin dizi" />
            <LibraryLine value={libraryMovies} label="izlediğin film" />
          </div>
          {!hasYearData && (
            <p className="mt-8 max-w-xs text-xs leading-relaxed text-white/35">
              Bunlar tüm zamanların. Tarihli günlük kaydı yeni başladı, o yüzden {year} sahneleri
              henüz oynamıyor — bundan sonra işaretlediğin her şey oraya da düşecek.
            </p>
          )}
        </Scene>
      )}

      {/* 7 — Zirve: posterin kendisi kompozisyonun merkezi */}
      {topRated && (
        <Scene tint="mor" slug="Zirve">
          <p className="text-sm text-white/50">En yükseği</p>
          <div className="mt-5 flex items-end gap-5">
            {topRated.poster_path && (
              <div
                className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:w-40"
                style={{ boxShadow: `0 0 60px -12px ${tintInk("mor")}` }}
              >
                <Image
                  src={`${TMDB_IMG}/w342${topRated.poster_path}`}
                  alt={topRated.title}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0 pb-1">
              <p
                className="font-display text-[clamp(2rem,9vw,3rem)] leading-[0.95] tracking-wide"
                style={{ color: tintInk("mor") }}
              >
                {topRated.title}
              </p>
              <p className="mt-2 text-xl tracking-[0.15em]" style={{ color: tintInk("mor") }}>
                {"★".repeat(topRated.rating ?? 0)}
                <span className="text-white/15">{"★".repeat(5 - (topRated.rating ?? 0))}</span>
              </p>
            </div>
          </div>
          {topProvider && (
            <p className="mt-8 text-sm text-white/45">
              En çok <span className="text-white/80">{topProvider[0]}</span> üzerinden izledin.
            </p>
          )}
        </Scene>
      )}

      {/* 8 — Final: paylaşılacak kart. Yıl kaydı yoksa kütüphane rakamlarını taşır. */}
      <Scene tint="amber" slug="Koçan">
        <ShareCard
          heading={hasYearData ? String(year) : "Kütüphanem"}
          shareText={
            hasYearData
              ? `${year} izleme özetim: ${formatHours(minutes)} saat, ${stats.episodeCount} bölüm, ${stats.movieCount} film.`
              : `İzleme kütüphanem: ${libraryEpisodes} bölüm, ${librarySeries} dizi, ${libraryMovies} film.`
          }
          cells={
            hasYearData
              ? [
                  { value: formatHours(minutes), label: "saat" },
                  { value: stats.episodeCount, label: "bölüm" },
                  { value: stats.movieCount, label: "film" },
                ]
              : [
                  { value: libraryEpisodes, label: "bölüm" },
                  { value: librarySeries, label: "dizi" },
                  { value: libraryMovies, label: "film" },
                ]
          }
          footnote={
            hasYearData ? `${stats.seriesCount} farklı dizi` : "Tüm zamanlar"
          }
          posters={posters}
        />
      </Scene>
    </main>
  );
}

function BigCount({
  value,
  label,
  tint,
  align,
}: {
  value: number;
  label: string;
  tint: "mor";
  align: "start" | "center" | "end";
}) {
  const justify =
    align === "start" ? "justify-start" : align === "center" ? "justify-center" : "justify-end";

  return (
    <div className={`flex items-baseline gap-3 ${justify}`}>
      <span
        className="font-display text-[clamp(3.5rem,17vw,6rem)] leading-[0.8] tracking-wide"
        style={{ color: tintInk(tint) }}
      >
        {value}
      </span>
      <span className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</span>
    </div>
  );
}

// Kütüphane sahnesi: "Sayım"ın diyagonalinden ayrışsın diye sola hizalı,
// aralarında ince çizgi olan bir liste.
function LibraryLine({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <span
        className="font-display text-[clamp(3rem,14vw,5rem)] leading-[0.8] tracking-wide"
        style={{ color: tintInk("gece") }}
      >
        {value}
      </span>
      <span className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</span>
    </div>
  );
}

function ShareCard({
  heading,
  shareText,
  cells,
  footnote,
  posters,
}: {
  heading: string;
  shareText: string;
  cells: { value: number | string; label: string }[];
  footnote: string;
  posters: { key: string; posterPath: string; title: string }[];
}) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Movie Track — ${heading}`, text: shareText });
        return;
      } catch {
        // Kullanıcı paylaşımı iptal etti; sessizce panoya düşüyoruz.
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    } catch {
      setShared(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-accent/25 bg-black/50 p-4 backdrop-blur-sm">
        <PosterWall posters={posters} variant="collage" />

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/35">
              İzleme Özeti
            </p>
            {/* Yıl kısa, "Kütüphanem" uzun; sabit boyut uzun başlığı kırpıyordu. */}
            <p
              className={`font-display leading-[0.85] tracking-wide text-accent ${
                heading.length > 6 ? "text-3xl" : "text-5xl"
              }`}
            >
              {heading}
            </p>
          </div>
          <dl className="grid shrink-0 grid-cols-3 gap-x-4 text-right">
            {cells.map((cell) => (
              <Cell key={cell.label} value={cell.value} label={cell.label} />
            ))}
          </dl>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="font-display text-base tracking-[0.25em] text-white/45">
            MOVIE TRACK
          </span>
          <span className="text-[10px] text-white/30">{footnote}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-xs font-semibold text-black transition hover:bg-accent/90"
        >
          <Share2 size={14} />
          {shared ? "Panoya kopyalandı" : "Paylaş"}
        </button>
        <Link
          href="/gunluk"
          className="flex flex-1 items-center justify-center rounded-xl border border-white/15 py-2.5 text-xs font-medium text-white/70 transition hover:border-white/30"
        >
          Günlüğü aç
        </Link>
      </div>

      <p className="mt-3 text-center text-[11px] text-white/30">
        Kartın ekran görüntüsünü alıp paylaşabilirsin.
      </p>
    </>
  );
}

function Cell({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <dd className="font-display text-2xl leading-none tracking-wide text-white/85">{value}</dd>
      <dt className="mt-0.5 text-[9px] uppercase tracking-wider text-white/35">{label}</dt>
    </div>
  );
}
