"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import EpisodeGrid from "@/components/EpisodeGrid";
import ProviderButton from "@/components/ProviderButton";
import WatchReturnPrompt from "@/components/WatchReturnPrompt";
import type { ProgressStatus, Title, TitleType, WatchedProgress } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

const STATUS_OPTIONS: { value: ProgressStatus; label: string }[] = [
  { value: "watching", label: "İzliyorum" },
  { value: "plan", label: "İzleyeceğim" },
  { value: "completed", label: "Bitirdim" },
];

export default function TitleDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const type = params.type as "movie" | "tv";
  const id = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState<Title | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProgressStatus | null>(null);
  const [progress, setProgress] = useState<WatchedProgress>({});
  const [activeSeason, setActiveSeason] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/title?type=${type}&id=${id}`).then((r) => r.json());
      if (res.title) {
        setTitle(res.title);
        setActiveSeason(res.title.seasons?.[0]?.season_number ?? null);
      }
      setLoading(false);
    })();
  }, [type, id]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      if (!user) return;

      const { data } = await supabase
        .from("user_progress")
        .select("status, progress")
        .eq("tmdb_id", Number(id))
        .maybeSingle();

      if (data) {
        setStatus(data.status);
        setProgress(data.progress ?? {});
      }
    })();
  }, [id]);

  async function persist(nextStatus: ProgressStatus, nextProgress: WatchedProgress) {
    if (!userId) return;
    await supabase.from("user_progress").upsert({
      user_id: userId,
      tmdb_id: Number(id),
      status: nextStatus,
      progress: nextProgress,
      updated_at: new Date().toISOString(),
    });
  }

  function handleStatusChange(next: ProgressStatus) {
    if (!userId) {
      router.push("/login");
      return;
    }
    setStatus(next);
    persist(next, progress);
  }

  function handleToggleEpisode(seasonNumber: number, episodeNumber: number) {
    if (!userId) {
      router.push("/login");
      return;
    }
    const seasonKey = String(seasonNumber);
    const current = progress[seasonKey] ?? [];
    const next = current.includes(episodeNumber)
      ? current.filter((n) => n !== episodeNumber)
      : [...current, episodeNumber].sort((a, b) => a - b);

    const nextProgress = { ...progress, [seasonKey]: next };
    const nextStatus = status ?? "watching";

    setProgress(nextProgress);
    setStatus(nextStatus);
    persist(nextStatus, nextProgress);
  }

  function handleConfirmEpisodeWatched(seasonNumber: number, episodeNumber: number) {
    const seasonKey = String(seasonNumber);
    const current = progress[seasonKey] ?? [];
    const next = current.includes(episodeNumber)
      ? current
      : [...current, episodeNumber].sort((a, b) => a - b);
    const nextProgress = { ...progress, [seasonKey]: next };

    setProgress(nextProgress);
    setStatus("watching");
    persist("watching", nextProgress);
  }

  function handleConfirmMovieWatched() {
    setStatus("completed");
    persist("completed", progress);
  }

  if (loading) {
    return <p className="p-6 text-center text-sm text-white/40">Yükleniyor...</p>;
  }

  if (!title) {
    return <p className="p-6 text-center text-sm text-white/40">Bulunamadı</p>;
  }

  const activeSeasonMeta = title.seasons.find((s) => s.season_number === activeSeason);

  return (
    <div className="pb-6">
      <div className="relative h-56 w-full">
        {title.backdrop_path ? (
          <Image
            src={`${TMDB_IMG}/w780${title.backdrop_path}`}
            alt={title.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full bg-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

        <Link
          href="/?focus=search"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur"
        >
          <Search size={18} className="text-white" />
        </Link>
      </div>

      <div className="relative -mt-10 px-4">
        <h1 className="text-xl font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          {title.title}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-white/70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          <span>{type === "movie" ? "Film" : "Dizi"}</span>
          {title.vote != null && (
            <span className="flex items-center gap-1">
              <Star size={14} className="fill-accent text-accent" />
              {title.vote.toFixed(1)}
            </span>
          )}
        </p>

        {title.overview && (
          <p className="mt-3 text-sm leading-relaxed text-white/60">{title.overview}</p>
        )}

        <ProvidersSection
          providers={title.providers}
          watchLink={title.watch_link}
          title={title.title}
          tmdbId={Number(id)}
          type={type}
          trackVisit={!!userId}
        />

        <section className="mt-6 rounded-2xl border border-white/5 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/80">Takip Durumu</h2>

          <div className="flex gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`flex-1 rounded-full py-2 text-xs font-medium transition ${
                  status === opt.value
                    ? "bg-accent text-black"
                    : "border border-white/10 text-white/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {type === "tv" && title.seasons.length > 0 && (
            <div className="mt-4">
              <select
                value={activeSeason ?? ""}
                onChange={(e) => setActiveSeason(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-bg px-3 py-2 text-sm text-white outline-none"
              >
                {title.seasons.map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    {s.name}
                  </option>
                ))}
              </select>

              {activeSeasonMeta && (
                <EpisodeGrid
                  episodeCount={activeSeasonMeta.episode_count}
                  watched={progress[String(activeSeasonMeta.season_number)] ?? []}
                  onToggle={(ep) => handleToggleEpisode(activeSeasonMeta.season_number, ep)}
                />
              )}
            </div>
          )}
        </section>
      </div>

      <WatchReturnPrompt
        userId={userId}
        tmdbId={Number(id)}
        type={type}
        title={title.title}
        seasons={title.seasons}
        progress={progress}
        onConfirmEpisode={handleConfirmEpisodeWatched}
        onConfirmMovie={handleConfirmMovieWatched}
      />
    </div>
  );
}

function ProvidersSection({
  providers,
  watchLink,
  title,
  tmdbId,
  type,
  trackVisit,
}: {
  providers: Title["providers"];
  watchLink: string | null;
  title: string;
  tmdbId: number;
  type: TitleType;
  trackVisit: boolean;
}) {
  const all = [...(providers.flatrate ?? []), ...(providers.rent ?? []), ...(providers.buy ?? [])];
  const unique = Array.from(new Map(all.map((p) => [p.provider_id, p])).values());

  if (unique.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-white/80">Nereden İzlenir</h2>
      <div className="flex flex-wrap gap-3">
        {unique.map((p) => (
          <ProviderButton
            key={p.provider_id}
            provider={p}
            title={title}
            tmdbId={tmdbId}
            type={type}
            fallbackWatchLink={watchLink}
            trackVisit={trackVisit}
          />
        ))}
      </div>
    </section>
  );
}
