export type TitleType = "movie" | "tv";

export type ProviderInfo = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

export type Providers = {
  flatrate?: ProviderInfo[];
  rent?: ProviderInfo[];
  buy?: ProviderInfo[];
};

export type TitleSeason = {
  season_number: number;
  name: string;
  episode_count: number;
};

export type Title = {
  tmdb_id: number;
  type: TitleType;
  title: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  providers: Providers;
  watch_link: string | null;
  seasons: TitleSeason[];
  vote: number | null;
  cached_at: string;
};

export type ProgressStatus = "watching" | "completed" | "plan";

// key: sezon numarası (string), value: izlenen bölüm numaraları
export type WatchedProgress = {
  [seasonNumber: string]: number[];
};

export type UserProgress = {
  user_id: string;
  tmdb_id: number;
  status: ProgressStatus;
  progress: WatchedProgress;
  updated_at: string;
};

export type SearchResult = {
  tmdb_id: number;
  type: TitleType;
  title: string;
  poster_path: string | null;
  vote: number | null;
};
