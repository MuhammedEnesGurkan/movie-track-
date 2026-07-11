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
  platforms: PlatformInfo[];
  watch_link: string | null;
  seasons: TitleSeason[];
  vote: number | null;
  cached_at: string;
};

// Fiyat bilgisi TMDB'den değil, streaming_platforms tablosundan gelir.
export type PlatformType = "subscription" | "rent" | "buy";

export type PlatformInfo = {
  provider_id: number;
  name: string;
  logo_path: string | null;
  type: PlatformType;
  monthly_price: number | null;
  currency: string | null;
};

export type StreamingPlatform = {
  id: string;
  tmdb_provider_id: number;
  name: string;
  logo_path: string | null;
  monthly_price: number | null;
  currency: string;
  updated_at: string;
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
