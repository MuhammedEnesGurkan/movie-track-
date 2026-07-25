import type { TitleType, WatchEventType } from "@/lib/types";

// watch_events + titles join'inin uygulama tarafındaki hâli.
export type WatchLogEntry = {
  id: string;
  type: TitleType;
  tmdb_id: number;
  event_type: WatchEventType;
  season_number: number | null;
  episode_number: number | null;
  watched_at: string;
  rewatch_number: number;
  title: string;
  poster_path: string | null;
};

export type YearStats = {
  movieCount: number;
  episodeCount: number;
  seriesCount: number;
  rewatchCount: number;
  // 12 elemanlı, Ocak=0; o ayda kaç izleme kaydı olduğunu tutar.
  monthlyCounts: number[];
  busiestMonth: { month: number; count: number } | null;
};

export const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export function getAvailableYears(entries: WatchLogEntry[]): number[] {
  const years = new Set<number>();
  entries.forEach((e) => years.add(new Date(e.watched_at).getFullYear()));
  return [...years].sort((a, b) => b - a);
}

export function computeYearStats(entries: WatchLogEntry[], year: number): YearStats {
  const inYear = entries.filter((e) => new Date(e.watched_at).getFullYear() === year);

  const monthlyCounts = Array(12).fill(0) as number[];
  const seriesIds = new Set<string>();
  let movieCount = 0;
  let episodeCount = 0;
  let rewatchCount = 0;

  for (const e of inYear) {
    monthlyCounts[new Date(e.watched_at).getMonth()] += 1;
    if (e.event_type === "movie") movieCount += 1;
    else {
      episodeCount += 1;
      seriesIds.add(`${e.type}-${e.tmdb_id}`);
    }
    if (e.rewatch_number > 1) rewatchCount += 1;
  }

  const busiest = monthlyCounts.reduce(
    (best, count, month) => (count > best.count ? { month, count } : best),
    { month: -1, count: 0 }
  );

  return {
    movieCount,
    episodeCount,
    seriesCount: seriesIds.size,
    rewatchCount,
    monthlyCounts,
    busiestMonth: busiest.month >= 0 ? busiest : null,
  };
}

// TMDB bölüm/film sürelerini başlık başına tutmuyoruz; ekran süresi bu iki
// ortalamayla tahmin ediliyor ve arayüzde "yaklaşık" olarak etiketleniyor.
export const AVG_EPISODE_MINUTES = 42;
export const AVG_MOVIE_MINUTES = 115;

export function estimateMinutes(stats: YearStats): number {
  return stats.episodeCount * AVG_EPISODE_MINUTES + stats.movieCount * AVG_MOVIE_MINUTES;
}

export function formatHours(minutes: number): string {
  return Math.round(minutes / 60).toLocaleString("tr-TR");
}

export function formatDays(minutes: number): string {
  return (minutes / 60 / 24).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

export function formatLira(amount: number, fractionDigits = 2): string {
  return `₺${amount.toLocaleString("tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

// Yıl içinde aboneliğin kaç ay boyunca ödendiğini varsayacağımız süre.
// İçinde bulunulan yıl için geçen ay sayısı, geçmiş yıllar için 12.
export function monthsElapsedInYear(year: number, now: Date = new Date()): number {
  if (year < now.getFullYear()) return 12;
  if (year > now.getFullYear()) return 0;
  return now.getMonth() + 1;
}

export type WatchLogDay = {
  key: string;
  label: string;
  entries: WatchLogEntry[];
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date, today: Date): string {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) return "Bugün";
  if (dayKey(date) === dayKey(yesterday)) return "Dün";

  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

// Girişleri güne göre gruplar. entries'in watched_at'e göre azalan sıralı
// geldiği varsayılır (sorgu öyle çekiyor), gruplar da o sırayı korur.
export function groupByDay(entries: WatchLogEntry[], now: Date = new Date()): WatchLogDay[] {
  const days: WatchLogDay[] = [];
  const indexByKey = new Map<string, number>();

  for (const entry of entries) {
    const date = new Date(entry.watched_at);
    const key = dayKey(date);
    const existing = indexByKey.get(key);

    if (existing === undefined) {
      indexByKey.set(key, days.length);
      days.push({ key, label: dayLabel(date, now), entries: [entry] });
    } else {
      days[existing].entries.push(entry);
    }
  }

  return days;
}

export function formatEntryDetail(entry: WatchLogEntry): string {
  if (entry.event_type === "movie") return "Film";
  if (entry.season_number == null || entry.episode_number == null) return "Bölüm";
  return `S${entry.season_number}B${entry.episode_number}`;
}

export function formatTime(watchedAt: string): string {
  return new Date(watchedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
