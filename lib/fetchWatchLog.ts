import type { SupabaseClient } from "@supabase/supabase-js";
import type { WatchLogEntry } from "@/lib/watchStats";

// watch_events'i titles ile birleştirip uygulama tipine çevirir.
// Sıralama: en yeni izleme en üstte.
export async function fetchWatchLog(
  supabase: SupabaseClient,
  userId: string,
  limit: number
): Promise<WatchLogEntry[]> {
  const { data, error } = await supabase
    .from("watch_events")
    .select(
      "id, type, tmdb_id, event_type, season_number, episode_number, watched_at, rewatch_number, titles(title, poster_path)"
    )
    .eq("user_id", userId)
    .order("watched_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    type: row.type,
    tmdb_id: row.tmdb_id,
    event_type: row.event_type,
    season_number: row.season_number,
    episode_number: row.episode_number,
    watched_at: row.watched_at,
    rewatch_number: row.rewatch_number,
    title: row.titles?.title ?? "",
    poster_path: row.titles?.poster_path ?? null,
  }));
}
