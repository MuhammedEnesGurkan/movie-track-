type EpisodeGridProps = {
  episodeCount: number;
  watched: number[];
  onToggle: (episodeNumber: number) => void;
};

export default function EpisodeGrid({ episodeCount, watched, onToggle }: EpisodeGridProps) {
  const episodes = Array.from({ length: episodeCount }, (_, i) => i + 1);

  return (
    <div className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-8 xl:grid-cols-10">
      {episodes.map((ep) => {
        const isWatched = watched.includes(ep);
        return (
          <button
            key={ep}
            onClick={() => onToggle(ep)}
            className={`aspect-square rounded-lg text-xs font-medium transition ${
              isWatched ? "bg-accent text-black" : "border border-white/10 bg-bg text-white/60"
            }`}
          >
            {ep}
          </button>
        );
      })}
    </div>
  );
}
