import type { SupabaseClient } from "@supabase/supabase-js";
import type { TitleType, WatchEventType } from "@/lib/types";

type LogWatchEventArgs = {
  userId: string;
  type: TitleType;
  tmdbId: number;
  eventType: WatchEventType;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

// Her "izlendi" işaretlemesinde watch_events'e bir satır ekler; user_progress
// güncel durumu tutar, bu tablo ise ne zaman izlendiğinin geçmişini tutar.
export async function logWatchEvent(supabase: SupabaseClient, args: LogWatchEventArgs) {
  const { userId, type, tmdbId, eventType, seasonNumber = null, episodeNumber = null } = args;

  let countQuery = supabase
    .from("watch_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .eq("tmdb_id", tmdbId)
    .eq("event_type", eventType);

  countQuery = seasonNumber === null
    ? countQuery.is("season_number", null)
    : countQuery.eq("season_number", seasonNumber);
  countQuery = episodeNumber === null
    ? countQuery.is("episode_number", null)
    : countQuery.eq("episode_number", episodeNumber);

  const { count } = await countQuery;

  await supabase.from("watch_events").insert({
    user_id: userId,
    type,
    tmdb_id: tmdbId,
    event_type: eventType,
    season_number: seasonNumber,
    episode_number: episodeNumber,
    watched_at: new Date().toISOString(),
    rewatch_number: (count ?? 0) + 1,
  });
}
