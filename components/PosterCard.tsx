import Image from "next/image";
import Link from "next/link";
import type { Providers, TitleType } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

type PosterCardProps = {
  tmdbId: number;
  type: TitleType;
  title: string;
  posterPath: string | null;
  providers?: Providers;
  subtitle?: string;
};

export default function PosterCard({
  tmdbId,
  type,
  title,
  posterPath,
  providers,
  subtitle,
}: PosterCardProps) {
  const flatrate = providers?.flatrate ?? [];

  return (
    <Link href={`/title/${type}/${tmdbId}`} className="flex w-28 shrink-0 flex-col gap-1.5">
      <div className="relative aspect-[2/3] w-28 overflow-hidden rounded-xl border border-white/5 bg-card">
        {posterPath ? (
          <Image
            src={`${TMDB_IMG}/w342${posterPath}`}
            alt={title}
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-white/30">
            {title}
          </div>
        )}
      </div>
      {flatrate.length > 0 && (
        <div className="flex gap-1">
          {flatrate.slice(0, 3).map((p) => (
            <div key={p.provider_id} className="relative h-4 w-4 overflow-hidden rounded">
              <Image
                src={`${TMDB_IMG}/w45${p.logo_path}`}
                alt={p.provider_name}
                fill
                sizes="16px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
      {subtitle && <p className="truncate text-[11px] text-white/40">{subtitle}</p>}
    </Link>
  );
}
