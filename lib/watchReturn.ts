import type { TitleType } from "./types";

const STORAGE_KEY = "watchlist:left-to-watch";

export type LeftToWatch = {
  tmdbId: number;
  type: TitleType;
  leftAt: number;
};

export function markLeftToWatch(tmdbId: number, type: TitleType) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tmdbId, type, leftAt: Date.now() }));
}

export function getLeftToWatch(): LeftToWatch | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LeftToWatch;
  } catch {
    return null;
  }
}

export function clearLeftToWatch() {
  sessionStorage.removeItem(STORAGE_KEY);
}
