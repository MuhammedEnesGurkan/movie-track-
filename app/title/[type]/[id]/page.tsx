"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import EpisodeGrid from "@/components/EpisodeGrid";
import PlatformCard from "@/components/PlatformCard";
import WatchReturnPrompt from "@/components/WatchReturnPrompt";
import { useToast } from "@/components/ToastProvider";
import type { ProgressStatus, Title, TitleSeason, TitleType, WatchedProgress } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

const STATUS_OPTIONS: { value: ProgressStatus; label: string }[] = [
  { value: "watching", label: "İzliyorum" },
  { value: "plan", label: "İzleyeceğim" },
  { value: "completed", label: "Bitirdim" },
];

const STATUS_TOAST_LABEL: Record<ProgressStatus, string> = {
  watching: "İZLİYORSUN",
  plan: "LİSTEDE",
  completed: "BİTİRDİN",
};

function getTotalEpisodes(seasons: TitleSeason[]) {
  return seasons
    .filter((s) => s.season_number > 0)
    .reduce((sum, s) => sum + s.episode_count, 0);
}

function countWatched(progress: WatchedProgress) {
  return Object.values(progress).reduce((sum, eps) => sum + eps.length, 0);
}

function buildFullProgress(seasons: TitleSeason[]): WatchedProgress {
  const result: WatchedProgress = {};
  for (const s of seasons) {
    if (s.season_number <= 0) continue;
    result[String(s.season_number)] = Array.from({ length: s.episode_count }, (_, i) => i + 1);
  }
  return result;
}

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
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const showToast = useToast();

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
        .select("status, progress, rating, note")
        .eq("tmdb_id", Number(id))
        .maybeSingle();

      if (data) {
        setStatus(data.status);
        setProgress(data.progress ?? {});
        setRating(data.rating ?? null);
        setNote(data.note ?? "");
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
    if (next === "completed" && type === "tv") {
      setShowCompleteConfirm(true);
      return;
    }
    setStatus(next);
    persist(next, progress);
    showToast({ label: STATUS_TOAST_LABEL[next], message: title?.title ?? "" });
  }

  function confirmCompleteAll() {
    if (!title) return;
    const fullProgress = buildFullProgress(title.seasons);
    setProgress(fullProgress);
    setStatus("completed");
    persist("completed", fullProgress);
    setShowCompleteConfirm(false);
    showToast({ label: STATUS_TOAST_LABEL.completed, message: title.title });
  }

  function handleToggleEpisode(seasonNumber: number, episodeNumber: number) {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (!title) return;

    const seasonKey = String(seasonNumber);
    const current = progress[seasonKey] ?? [];
    const wasWatched = current.includes(episodeNumber);
    const next = wasWatched
      ? current.filter((n) => n !== episodeNumber)
      : [...current, episodeNumber].sort((a, b) => a - b);

    const nextProgress = { ...progress, [seasonKey]: next };
    const totalEpisodes = getTotalEpisodes(title.seasons);
    const totalWatched = countWatched(nextProgress);

    let nextStatus = status ?? "watching";
    let justCompleted = false;

    if (wasWatched && status === "completed") {
      nextStatus = "watching";
    } else if (
      !wasWatched &&
      status !== "completed" &&
      totalEpisodes > 0 &&
      totalWatched >= totalEpisodes
    ) {
      nextStatus = "completed";
      justCompleted = true;
    }

    setProgress(nextProgress);
    setStatus(nextStatus);
    persist(nextStatus, nextProgress);
    if (justCompleted && title) showToast({ label: STATUS_TOAST_LABEL.completed, message: title.title });
  }

  function handleConfirmEpisodeWatched(seasonNumber: number, episodeNumber: number) {
    if (!title) return;

    const seasonKey = String(seasonNumber);
    const current = progress[seasonKey] ?? [];
    const next = current.includes(episodeNumber)
      ? current
      : [...current, episodeNumber].sort((a, b) => a - b);
    const nextProgress = { ...progress, [seasonKey]: next };

    const totalEpisodes = getTotalEpisodes(title.seasons);
    const totalWatched = countWatched(nextProgress);
    const isNowComplete = totalEpisodes > 0 && totalWatched >= totalEpisodes;
    const nextStatus: ProgressStatus = isNowComplete ? "completed" : "watching";

    setProgress(nextProgress);
    setStatus(nextStatus);
    persist(nextStatus, nextProgress);
    if (isNowComplete && title) showToast({ label: STATUS_TOAST_LABEL.completed, message: title.title });
  }

  function handleConfirmMovieWatched() {
    setStatus("completed");
    persist("completed", progress);
    if (title) showToast({ label: STATUS_TOAST_LABEL.completed, message: title.title });
  }

  async function handleRemoveFromLibrary() {
    if (!userId) return;
    await supabase.from("user_progress").delete().eq("user_id", userId).eq("tmdb_id", Number(id));
    setStatus(null);
    setProgress({});
    setShowRemoveConfirm(false);
    if (title) showToast({ label: "ÇIKARILDI", message: title.title, tone: "red" });
  }

  async function handleRate(nextRating: number) {
    if (!userId) {
      router.push("/login");
      return;
    }
    setRating(nextRating);
    await supabase.from("user_progress").upsert({
      user_id: userId,
      tmdb_id: Number(id),
      status: status ?? "completed",
      progress,
      rating: nextRating,
      note: note || null,
      updated_at: new Date().toISOString(),
    });
  }

  async function handleSaveNote() {
    if (!userId) return;
    await supabase.from("user_progress").upsert({
      user_id: userId,
      tmdb_id: Number(id),
      status: status ?? "completed",
      progress,
      rating,
      note: note || null,
      updated_at: new Date().toISOString(),
    });
  }

  if (loading) {
    return <p className="p-6 text-center text-sm text-white/40">Yükleniyor...</p>;
  }

  if (!title) {
    return <p className="p-6 text-center text-sm text-white/40">Bulunamadı</p>;
  }

  const activeSeasonMeta = title.seasons.find((s) => s.season_number === activeSeason);

  const statusButtons = (variant: "row" | "col") => (
    <div className={variant === "row" ? "flex gap-2" : "flex flex-col gap-2"}>
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleStatusChange(opt.value)}
          className={`${variant === "row" ? "flex-1" : "w-full"} rounded-full py-2 text-xs font-medium transition ${
            status === opt.value ? "bg-accent text-black" : "border border-white/10 text-white/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const removeButton = status !== null && (
    <button
      onClick={() => setShowRemoveConfirm(true)}
      className="mt-3 w-full text-center text-xs text-red-400/80"
    >
      Kütüphaneden Çıkar
    </button>
  );

  const ratingSection = status === "completed" && (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="mb-2 text-xs font-semibold text-white/50">Puanın</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => handleRate(n)} aria-label={`${n} yıldız`}>
            <Star
              size={22}
              className={n <= (rating ?? 0) ? "fill-accent text-accent" : "text-white/20"}
            />
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleSaveNote}
        placeholder="Kısa bir not ekle (opsiyonel)"
        rows={2}
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-bg px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
      />
    </div>
  );

  const seasonAndEpisodes = (
    <>
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
    </>
  );

  return (
    <div className="pb-6 lg:pb-10">
      <div className="relative h-56 w-full lg:h-80">
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
        <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />

        <Link
          href="/?focus=search"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur"
        >
          <Search size={18} className="text-white" />
        </Link>
      </div>

      {/* Mobil/tablet: mevcut tek kolon akış (birebir korunuyor) */}
      <div className="relative px-4 pt-4 md:px-6 lg:hidden">
        <h1 className="font-display text-3xl tracking-wide">{title.title}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
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
          platforms={title.platforms}
          watchLink={title.watch_link}
          title={title.title}
          tmdbId={Number(id)}
          type={type}
          trackVisit={!!userId}
        />

        <section className="mt-6 rounded-2xl border border-white/5 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/80">Takip Durumu</h2>
          {statusButtons("row")}
          {type === "tv" && title.seasons.length > 0 && (
            <div className="mt-4">{seasonAndEpisodes}</div>
          )}
          {ratingSection}
          {removeButton}
        </section>
      </div>

      {/* Masaüstü: iki kolon */}
      <div className="hidden lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-8 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-6 lg:sticky lg:top-8">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/5 bg-card">
            {title.poster_path ? (
              <Image
                src={`${TMDB_IMG}/w342${title.poster_path}`}
                alt={title.title}
                fill
                sizes="288px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-xs text-white/30">
                {title.title}
              </div>
            )}
          </div>

          <ProvidersSection
            platforms={title.platforms}
            watchLink={title.watch_link}
            title={title.title}
            tmdbId={Number(id)}
            type={type}
            trackVisit={!!userId}
          />

          <div className="rounded-2xl border border-white/5 bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-white/80">Takip Durumu</h2>
            {statusButtons("col")}
            {ratingSection}
            {removeButton}
          </div>
        </div>

        <div>
          <h1 className="font-display text-4xl tracking-wide">{title.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
            <span>{type === "movie" ? "Film" : "Dizi"}</span>
            {title.vote != null && (
              <span className="flex items-center gap-1">
                <Star size={14} className="fill-accent text-accent" />
                {title.vote.toFixed(1)}
              </span>
            )}
          </p>

          {title.overview && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
              {title.overview}
            </p>
          )}

          {type === "tv" && title.seasons.length > 0 && (
            <div className="mt-6 max-w-xl">{seasonAndEpisodes}</div>
          )}
        </div>
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

      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-5">
            <p className="text-sm text-white/80">
              Tüm bölümler izlendi olarak işaretlenecek ({getTotalEpisodes(title.seasons)} bölüm).
              Onaylıyor musun?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={confirmCompleteAll}
                className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-black"
              >
                Evet
              </button>
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 rounded-full border border-white/20 py-3 text-sm font-semibold text-white"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-5">
            <p className="text-sm text-white/80">
              Bu başlığı kütüphaneden çıkarmak istediğine emin misin? Tüm ilerleme silinecek.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleRemoveFromLibrary}
                className="flex-1 rounded-full bg-red-500 py-3 text-sm font-semibold text-white"
              >
                Evet, çıkar
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 rounded-full border border-white/20 py-3 text-sm font-semibold text-white"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProvidersSection({
  platforms,
  watchLink,
  title,
  tmdbId,
  type,
  trackVisit,
}: {
  platforms: Title["platforms"];
  watchLink: string | null;
  title: string;
  tmdbId: number;
  type: TitleType;
  trackVisit: boolean;
}) {
  if (platforms.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-white/80">Nereden İzlenir</h2>
      <div className="flex flex-col gap-2">
        {platforms.map((p) => (
          <PlatformCard
            key={p.provider_id}
            platform={p}
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
