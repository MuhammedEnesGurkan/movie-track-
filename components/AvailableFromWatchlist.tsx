import Image from "next/image";
import Link from "next/link";
import PlatformLogo from "@/components/PlatformLogo";
import type { TitleType } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

export type AvailableItem = {
  tmdb_id: number;
  type: TitleType;
  title: string;
  poster_path: string | null;
  platformName: string;
  platformLogo: string | null;
};

type AvailableFromWatchlistProps = {
  items: AvailableItem[];
  loading: boolean;
  error: string | null;
};

function SectionHeader() {
  return (
    <div className="mb-3 flex items-baseline gap-3 border-b border-accent/20 pb-2">
      <h2 className="font-display text-2xl tracking-wide text-accent">
        Takip Listemden Şimdi İzlenebilir
      </h2>
    </div>
  );
}

export default function AvailableFromWatchlist({ items, loading, error }: AvailableFromWatchlistProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-white/5 bg-card p-4">
        <SectionHeader />
        <p className="text-xs text-white/40">Aboneliklerine göre kontrol ediliyor...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-white/5 bg-card p-4">
        <SectionHeader />
        <p className="text-xs text-red-400">Yüklenemedi. {error}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-card p-4">
      <SectionHeader />
      <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible xl:grid-cols-7">
        {items.map((item) => (
          <Link
            key={`${item.type}-${item.tmdb_id}`}
            href={`/title/${item.type}/${item.tmdb_id}`}
            className="flex w-28 shrink-0 flex-col gap-1.5 lg:w-full"
          >
            <div className="relative aspect-[2/3] w-28 overflow-hidden rounded-xl border border-white/5 bg-bg transition duration-300 lg:w-full lg:hover:-translate-y-1 lg:hover:border-accent/60">
              {item.poster_path ? (
                <Image
                  src={`${TMDB_IMG}/w342${item.poster_path}`}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1280px) 14vw, (min-width: 1024px) 16vw, 112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-2 text-center text-xs text-white/30">
                  {item.title}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <PlatformLogo name={item.platformName} logoPath={item.platformLogo} size={14} />
              <span className="truncate text-[11px] text-white/50">{item.platformName}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
