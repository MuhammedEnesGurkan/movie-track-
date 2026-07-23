import type { TitleSeason, WatchedProgress } from "@/lib/types";

export function getNextEpisode(
  seasons: TitleSeason[],
  progress: WatchedProgress
): { season: number; episode: number } | null {
  if (seasons.length === 0) return null;

  let lastSeason = 0;
  let lastEpisode = 0;
  for (const s of seasons) {
    const watched = progress[String(s.season_number)] ?? [];
    if (watched.length === 0) continue;
    const maxEp = Math.max(...watched);
    if (s.season_number > lastSeason || (s.season_number === lastSeason && maxEp > lastEpisode)) {
      lastSeason = s.season_number;
      lastEpisode = maxEp;
    }
  }

  if (lastSeason === 0) {
    const first = seasons[0];
    return { season: first.season_number, episode: 1 };
  }

  const currentSeasonMeta = seasons.find((s) => s.season_number === lastSeason);
  if (!currentSeasonMeta) return null;

  if (lastEpisode < currentSeasonMeta.episode_count) {
    return { season: lastSeason, episode: lastEpisode + 1 };
  }

  const nextSeasonMeta = seasons.find((s) => s.season_number === lastSeason + 1);
  return nextSeasonMeta ? { season: nextSeasonMeta.season_number, episode: 1 } : null;
}
