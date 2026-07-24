"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search as SearchIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PosterCard from "@/components/PosterCard";
import ContinueWatchingCard from "@/components/ContinueWatchingCard";
import AvailableFromWatchlist, { type AvailableItem } from "@/components/AvailableFromWatchlist";
import { useToast } from "@/components/ToastProvider";
import { getNextEpisode } from "@/lib/nextEpisode";
import { logWatchEvent } from "@/lib/watchEvents";
import type { SearchResult, TitleSeason, TitleType, WatchedProgress } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

type ContinueItem = {
  tmdb_id: number;
  type: TitleType;
  title: string;
  poster_path: string | null;
  summary: string | null;
  seasons: TitleSeason[];
  progress: WatchedProgress;
};

type AsyncState = {
  loading: boolean;
  error: string | null;
};

function getProgressSummary(type: TitleType, progress: WatchedProgress): string | null {
  if (type !== "tv") return null;
  const seasonNumbers = Object.keys(progress)
    .map(Number)
    .filter((s) => (progress[String(s)]?.length ?? 0) > 0);
  if (seasonNumbers.length === 0) return null;
  const lastSeason = Math.max(...seasonNumbers);
  const episodes = progress[String(lastSeason)] ?? [];
  const lastEpisode = Math.max(...episodes);
  return `S${lastSeason}B${lastEpisode}'te kaldın`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Beklenmedik bir hata oluştu";
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [recommended, setRecommended] = useState<SearchResult[]>([]);
  const [recommendedBecause, setRecommendedBecause] = useState<string | null>(null);
  const [discoverState, setDiscoverState] = useState<AsyncState>({ loading: true, error: null });

  const [continueWatching, setContinueWatching] = useState<ContinueItem[]>([]);
  const [continueState, setContinueState] = useState<AsyncState>({ loading: true, error: null });

  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [availableState, setAvailableState] = useState<AsyncState>({ loading: true, error: null });

  const [userId, setUserId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const showToast = useToast();

  useEffect(() => {
    if (searchParams.get("focus") === "search") {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`).then((r) =>
          r.json()
        );
        setResults(res.results ?? []);
      } catch (err) {
        setSearchError(errorMessage(err));
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      // Trend + kullanıcıya göre öneri
      try {
        const trendData = await fetch("/api/trending").then((r) => r.json());
        const trendResults: SearchResult[] = trendData.results ?? [];
        setTrending(trendResults);
        setRecommended(trendResults);
      } catch (err) {
        setDiscoverState({ loading: false, error: errorMessage(err) });
        setContinueState({ loading: false, error: null });
        setAvailableState({ loading: false, error: null });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setDiscoverState({ loading: false, error: null });
        setContinueState({ loading: false, error: null });
        setAvailableState({ loading: false, error: null });
        return;
      }
      setUserId(user.id);

      // Devam Et
      try {
        const { data: watchingRows, error } = await supabase
          .from("user_progress")
          .select("tmdb_id, progress, titles(type, title, poster_path, seasons)")
          .eq("status", "watching")
          .order("updated_at", { ascending: false })
          .limit(10);
        if (error) throw error;

        setContinueWatching(
          (watchingRows ?? []).map((row: any) => ({
            tmdb_id: row.tmdb_id,
            type: (row.titles?.type ?? "tv") as TitleType,
            title: row.titles?.title ?? "",
            poster_path: row.titles?.poster_path ?? null,
            summary: getProgressSummary(row.titles?.type ?? "tv", row.progress ?? {}),
            seasons: row.titles?.seasons ?? [],
            progress: row.progress ?? {},
          }))
        );
        setContinueState({ loading: false, error: null });
      } catch (err) {
        setContinueState({ loading: false, error: errorMessage(err) });
      }

      // Takip listemden şimdi izlenebilir (aboneliklere göre)
      try {
        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("subscribed_platforms")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        const subscribedIds: number[] = profileRow?.subscribed_platforms ?? [];

        if (subscribedIds.length === 0) {
          setAvailableItems([]);
          setAvailableState({ loading: false, error: null });
        } else {
          const { data: planRows, error: planError } = await supabase
            .from("user_progress")
            .select("tmdb_id, titles(type, title, poster_path, providers)")
            .eq("user_id", user.id)
            .eq("status", "plan")
            .order("updated_at", { ascending: false })
            .limit(20);
          if (planError) throw planError;

          const matched: AvailableItem[] = (planRows ?? [])
            .map((row: any) => {
              const flatrate = row.titles?.providers?.flatrate ?? [];
              const match = flatrate.find((p: any) => subscribedIds.includes(p.provider_id));
              if (!match) return null;
              return {
                tmdb_id: row.tmdb_id,
                type: (row.titles?.type ?? "movie") as TitleType,
                title: row.titles?.title ?? "",
                poster_path: row.titles?.poster_path ?? null,
                platformName: match.provider_name,
                platformLogo: match.logo_path ?? null,
              };
            })
            .filter((x: AvailableItem | null): x is AvailableItem => x !== null);

          setAvailableItems(matched);
          setAvailableState({ loading: false, error: null });
        }
      } catch (err) {
        setAvailableState({ loading: false, error: errorMessage(err) });
      }

      // Senin İçin (en son izlemeye benzer)
      try {
        const { data: watchingRow } = await supabase
          .from("user_progress")
          .select("tmdb_id, titles(type, title)")
          .eq("status", "watching")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const watchingType = (watchingRow as any)?.titles?.type;
        const watchingTitle = (watchingRow as any)?.titles?.title as string | undefined;
        if (watchingRow && watchingType) {
          const simData = await fetch(
            `/api/trending?similarTo=${watchingRow.tmdb_id}&type=${watchingType}`
          ).then((r) => r.json());
          const simResults: SearchResult[] = simData.results ?? [];
          if (simResults.length > 0) {
            setRecommended(simResults);
            setRecommendedBecause(watchingTitle ?? null);
          }
        }
        setDiscoverState({ loading: false, error: null });
      } catch (err) {
        setDiscoverState({ loading: false, error: errorMessage(err) });
      }
    })();
  }, []);

  async function handleMarkNextEpisode(item: ContinueItem) {
    if (!userId) return;
    const next = getNextEpisode(item.seasons, item.progress);
    if (!next) return;

    setMarkingId(item.tmdb_id);
    const seasonKey = String(next.season);
    const current = item.progress[seasonKey] ?? [];
    const nextProgress = {
      ...item.progress,
      [seasonKey]: [...current, next.episode].sort((a, b) => a - b),
    };

    const totalEpisodes = item.seasons
      .filter((s) => s.season_number > 0)
      .reduce((sum, s) => sum + s.episode_count, 0);
    const totalWatched = Object.values(nextProgress).reduce((sum, eps) => sum + eps.length, 0);
    const isNowComplete = totalEpisodes > 0 && totalWatched >= totalEpisodes;
    const nextStatus = isNowComplete ? "completed" : "watching";

    try {
      const supabase = createClient();
      const { error } = await supabase.from("user_progress").upsert({
        user_id: userId,
        tmdb_id: item.tmdb_id,
        type: item.type,
        status: nextStatus,
        progress: nextProgress,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      await logWatchEvent(supabase, {
        userId,
        type: item.type,
        tmdbId: item.tmdb_id,
        eventType: "episode",
        seasonNumber: next.season,
        episodeNumber: next.episode,
      });

      setContinueWatching((prev) =>
        isNowComplete
          ? prev.filter((i) => i.tmdb_id !== item.tmdb_id)
          : prev.map((i) =>
              i.tmdb_id === item.tmdb_id
                ? { ...i, progress: nextProgress, summary: getProgressSummary(i.type, nextProgress) }
                : i
            )
      );
      showToast({
        label: isNowComplete ? "BİTİRDİN" : "İZLENDİ",
        message: `${item.title} — S${next.season}B${next.episode}`,
      });
    } catch (err) {
      showToast({ label: "HATA", message: "İşaretlenemedi, tekrar dene", tone: "red" });
    } finally {
      setMarkingId(null);
    }
  }

  const showSearch = query.trim().length > 0;

  return (
    <main className="px-4 pt-6 md:px-6 lg:px-8">
      <div className="relative md:mx-auto md:max-w-xl">
        <SearchIcon
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Dizi veya film ara..."
          className="w-full rounded-2xl border border-white/5 bg-card py-3 pl-11 pr-4 text-sm outline-none placeholder:text-white/30 focus:border-accent/50"
        />
      </div>

      {showSearch ? (
        <div className="mt-4 flex flex-col gap-2 md:mx-auto md:max-w-xl">
          {searching && <p className="py-6 text-center text-sm text-white/40">Aranıyor...</p>}
          {!searching && searchError && (
            <p className="py-6 text-center text-sm text-red-400">Arama başarısız oldu. {searchError}</p>
          )}
          {!searching && !searchError && results.length === 0 && (
            <p className="py-6 text-center text-sm text-white/40">Sonuç bulunamadı</p>
          )}
          {results.map((r) => (
            <Link
              key={`${r.type}-${r.tmdb_id}`}
              href={`/title/${r.type}/${r.tmdb_id}`}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-2"
            >
              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {r.poster_path && (
                  <Image
                    src={`${TMDB_IMG}/w154${r.poster_path}`}
                    alt={r.title}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-white/40">
                  {r.type === "movie" ? "Film" : "Dizi"}
                  {r.vote ? ` · ⭐ ${r.vote.toFixed(1)}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {(continueState.loading || continueState.error || continueWatching.length > 0) && (
            <section className="rounded-2xl border border-white/5 bg-card p-4">
              <div className="mb-3 flex items-baseline gap-3 border-b border-accent/20 pb-2">
                <h2 className="font-display text-2xl tracking-wide text-accent">Devam Et</h2>
              </div>
              {continueState.loading && (
                <p className="text-xs text-white/40">Yükleniyor...</p>
              )}
              {!continueState.loading && continueState.error && (
                <p className="text-xs text-red-400">Yüklenemedi. {continueState.error}</p>
              )}
              {!continueState.loading && !continueState.error && continueWatching.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible xl:grid-cols-7">
                  {continueWatching.map((item) => (
                    <ContinueWatchingCard
                      key={`${item.type}-${item.tmdb_id}`}
                      tmdbId={item.tmdb_id}
                      type={item.type}
                      title={item.title}
                      posterPath={item.poster_path}
                      subtitle={item.summary ?? undefined}
                      nextEpisode={item.type === "tv" ? getNextEpisode(item.seasons, item.progress) : null}
                      marking={markingId === item.tmdb_id}
                      onMarkWatched={() => handleMarkNextEpisode(item)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <AvailableFromWatchlist
            items={availableItems}
            loading={availableState.loading}
            error={availableState.error}
          />

          {discoverState.loading ? (
            <p className="text-xs text-white/40">Öneriler yükleniyor...</p>
          ) : discoverState.error ? (
            <p className="text-xs text-red-400">Öneriler yüklenemedi. {discoverState.error}</p>
          ) : (
            <>
              <Rail
                title="Senin İçin"
                caption={recommendedBecause ? `${recommendedBecause} izlediğin için` : undefined}
                items={recommended}
              />
              <Rail title="Trend" items={trending} />
            </>
          )}
        </div>
      )}
    </main>
  );
}

function Rail({ title, caption, items }: { title: string; caption?: string; items: SearchResult[] }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3 border-b border-accent/20 pb-2">
        <h2 className="font-display text-2xl tracking-wide text-accent">{title}</h2>
        {caption && <p className="truncate text-xs text-white/40">{caption}</p>}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible xl:grid-cols-7">
        {items.map((item) => (
          <PosterCard
            key={`${item.type}-${item.tmdb_id}`}
            tmdbId={item.tmdb_id}
            type={item.type}
            title={item.title}
            posterPath={item.poster_path}
          />
        ))}
      </div>
    </section>
  );
}
