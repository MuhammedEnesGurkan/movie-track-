const REMEMBER_KEY = "watchlist:remember";
const LAST_ACTIVE_KEY = "watchlist:lastActive";

const SHORT_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 1 gün (Beni Hatırla kapalı)
const LONG_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün (Beni Hatırla açık)

export function setRemember(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

export function touchActivity() {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

export function isIdleTimedOut(): boolean {
  const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? 0);
  if (!lastActive) return false;
  const remember = localStorage.getItem(REMEMBER_KEY) === "1";
  const limit = remember ? LONG_TIMEOUT_MS : SHORT_TIMEOUT_MS;
  return Date.now() - lastActive > limit;
}

export function clearSessionTimeoutState() {
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(LAST_ACTIVE_KEY);
}
