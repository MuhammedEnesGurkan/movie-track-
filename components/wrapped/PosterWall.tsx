import Image from "next/image";

const TMDB_IMG = "https://image.tmdb.org/t/p";

export type WallPoster = {
  key: string;
  posterPath: string;
  title: string;
};

type PosterWallProps = {
  posters: WallPoster[];
  /** Işığın arkasında kalan dekor mu, yoksa öne çıkan kolaj mı. */
  variant?: "backdrop" | "collage";
};

// Yılın posterleri. "backdrop" hâlinde huzmenin arkasında sönük bir duvar
// olarak durur; "collage" hâlinde final kartının ana görselidir.
export default function PosterWall({ posters, variant = "backdrop" }: PosterWallProps) {
  if (posters.length === 0) return null;

  const isBackdrop = variant === "backdrop";
  // Duvarın seyrek görünmemesi için listeyi tekrarlayarak dolduruyoruz.
  const needed = isBackdrop ? 24 : 8;
  const filled = Array.from(
    { length: needed },
    (_, i) => posters[i % posters.length]
  );

  return (
    <div
      aria-hidden
      className={
        isBackdrop
          ? "poster-drift pointer-events-none absolute inset-x-0 -top-[8%] bottom-0 z-0 grid grid-cols-3 gap-1.5 opacity-[0.18] blur-[1px] sm:grid-cols-4 lg:grid-cols-6"
          : "grid grid-cols-4 gap-1 overflow-hidden rounded-xl"
      }
    >
      {filled.map((poster, i) => (
        <div
          key={`${poster.key}-${i}`}
          className="relative aspect-[2/3] overflow-hidden rounded-md bg-white/5"
        >
          <Image
            src={`${TMDB_IMG}/w342${poster.posterPath}`}
            alt=""
            fill
            sizes={isBackdrop ? "(min-width:1024px) 17vw, 33vw" : "25vw"}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
