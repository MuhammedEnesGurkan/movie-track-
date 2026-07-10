import type { Providers, TitleSeason, TitleType } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "tr-TR");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status}`);
  }
  return res.json();
}

export function searchMulti(query: string) {
  return tmdbFetch("/search/multi", { query, include_adult: "false" });
}

export function getTrending() {
  return tmdbFetch("/trending/all/week");
}

export function getSimilar(type: TitleType, id: number) {
  return tmdbFetch(`/${type}/${id}/similar`);
}

// Tek istek: detay + izleme sağlayıcıları birlikte
export function getTitleDetails(type: TitleType, id: string) {
  return tmdbFetch(`/${type}/${id}`, {
    append_to_response: "watch/providers",
  });
}

export function extractTRProviders(details: any): Providers {
  const tr = details?.["watch/providers"]?.results?.TR;
  if (!tr) return {};
  const pick = (list: any[] = []) =>
    list.map((p) => ({
      provider_id: p.provider_id,
      provider_name: p.provider_name,
      logo_path: p.logo_path,
    }));
  return {
    flatrate: tr.flatrate ? pick(tr.flatrate) : undefined,
    rent: tr.rent ? pick(tr.rent) : undefined,
    buy: tr.buy ? pick(tr.buy) : undefined,
  };
}

export function extractWatchLink(details: any): string | null {
  return details?.["watch/providers"]?.results?.TR?.link ?? null;
}

export function extractSeasons(details: any): TitleSeason[] {
  if (!details?.seasons) return [];
  return details.seasons
    .filter((s: any) => s.season_number > 0)
    .map((s: any) => ({
      season_number: s.season_number,
      name: s.name,
      episode_count: s.episode_count,
    }));
}
