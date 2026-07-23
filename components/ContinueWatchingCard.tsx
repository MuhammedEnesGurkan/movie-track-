import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import type { TitleType } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

type ContinueWatchingCardProps = {
  tmdbId: number;
  type: TitleType;
  title: string;
  posterPath: string | null;
  subtitle?: string;
  nextEpisode?: { season: number; episode: number } | null;
  onMarkWatched?: () => void;
  marking?: boolean;
};

export default function ContinueWatchingCard({
  tmdbId,
  type,
  title,
  posterPath,
  subtitle,
  nextEpisode,
  onMarkWatched,
  marking,
}: ContinueWatchingCardProps) {
  return (
    <div className="flex w-28 shrink-0 flex-col gap-1.5 lg:w-full">
      <Link href={`/title/${type}/${tmdbId}`} className="block">
        <div className="relative aspect-[2/3] w-28 overflow-hidden rounded-xl border border-white/5 bg-card transition duration-300 lg:w-full lg:hover:-translate-y-1 lg:hover:border-accent/60 lg:hover:shadow-[0_0_18px_-2px_theme(colors.accent)]">
          {posterPath ? (
            <Image
              src={`${TMDB_IMG}/w342${posterPath}`}
              alt={title}
              fill
              sizes="(min-width: 1280px) 14vw, (min-width: 1024px) 16vw, 112px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-xs text-white/30">
              {title}
            </div>
          )}
        </div>
      </Link>
      {subtitle && <p className="truncate text-[11px] text-white/40">{subtitle}</p>}
      {nextEpisode && onMarkWatched && (
        <button
          onClick={onMarkWatched}
          disabled={marking}
          className="flex items-center justify-center gap-1 rounded-lg border border-accent/30 bg-accent/10 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
        >
          <Check size={11} />
          S{nextEpisode.season}B{nextEpisode.episode}
        </button>
      )}
    </div>
  );
}
