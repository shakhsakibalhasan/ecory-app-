import type { QueryClient } from "@tanstack/react-query";

// Only public catalogue content; never persist profiles, orders, tokens or admin queries.
export const PUBLIC_QUERY_KEYS = new Set([
  "review-ratings",
  "products",
  "settings",
  "categories",
  "banners",
  "posts",
  "reviews",
  "doctors",
  "certifications",
  "offers",
  "branding",
  "presentation",
  "contacts",
  "outlets",
]);
const CACHE_KEY = "ecory-public-content-v1";
const VISUAL_KEYS = new Set(["branding", "presentation", "banners", "categories", "settings"]);
const offlineKeys = new Set<string>();
export function hasOfflineContent() {
  return offlineKeys.size > 0;
}
export function markPublicOnline(key: readonly unknown[]) {
  if (offlineKeys.delete(JSON.stringify(key)) && typeof window !== "undefined")
    window.dispatchEvent(new Event("ecory-content-status"));
}
export function offlinePublicContent(key: readonly unknown[]): unknown {
  if (typeof window === "undefined" || key.length !== 1 || !PUBLIC_QUERY_KEYS.has(String(key[0])))
    return undefined;
  try {
    const rows = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    if (!Array.isArray(rows)) return undefined;
    const row = rows.find(
      (r: any) =>
        JSON.stringify(r.key) === JSON.stringify(key) &&
        Number.isFinite(r.updatedAt) &&
        r.updatedAt <= Date.now() &&
        Date.now() - r.updatedAt <= MAX_AGE,
    );
    if (!row || row.data === undefined || (row.data !== null && typeof row.data !== "object"))
      return undefined;
    offlineKeys.add(JSON.stringify(key));
    window.dispatchEvent(new Event("ecory-content-status"));
    return row.data;
  } catch {
    return undefined;
  }
}
const MAX_AGE = 12 * 60 * 60 * 1000;
export function restorePublicQueries(client: QueryClient) {
  if (typeof window === "undefined") return;
  try {
    const rows = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (
        !Array.isArray(row.key) ||
        row.key.length !== 1 ||
        !PUBLIC_QUERY_KEYS.has(row.key[0]) ||
        !Number.isFinite(row.updatedAt) ||
        row.updatedAt > Date.now() ||
        Date.now() - row.updatedAt > MAX_AGE ||
        row.data === undefined
      )
        continue;
      const arrays = new Set([
        "products",
        "categories",
        "banners",
        "posts",
        "reviews",
        "doctors",
        "certifications",
        "offers",
        "outlets",
      ]);
      if (
        arrays.has(row.key[0])
          ? !Array.isArray(row.data) || row.data.some((x: unknown) => !x || typeof x !== "object")
          : row.data !== null && (typeof row.data !== "object" || Array.isArray(row.data))
      )
        continue;
      if (!VISUAL_KEYS.has(row.key[0])) client.setQueryData(row.key, row.data, { updatedAt: 1 });
    }
  } catch {
    /* Invalid/blocked storage must not prevent startup. */
  }
}
export function persistPublicQueries(client: QueryClient): () => void {
  if (typeof window === "undefined") return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = client.getQueryCache().subscribe((event) => {
    const key = event.query.queryKey;
    if (
      event.type !== "updated" ||
      key.length !== 1 ||
      !PUBLIC_QUERY_KEYS.has(String(key[0])) ||
      event.query.state.status !== "success" ||
      timer
    )
      return;
    timer = setTimeout(() => {
      timer = undefined;
      try {
        const rows = client
          .getQueryCache()
          .getAll()
          .filter(
            (q) =>
              q.queryKey.length === 1 &&
              PUBLIC_QUERY_KEYS.has(String(q.queryKey[0])) &&
              q.state.data !== undefined &&
              !offlineKeys.has(JSON.stringify(q.queryKey)) &&
              Date.now() - q.state.dataUpdatedAt <= MAX_AGE,
          )
          .map((q) => ({ key: q.queryKey, data: q.state.data, updatedAt: q.state.dataUpdatedAt }));
        const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
        if (Array.isArray(saved))
          saved.forEach((row: any) => {
            if (offlineKeys.has(JSON.stringify(row.key)) && Date.now() - row.updatedAt <= MAX_AGE)
              rows.push(row);
          });
        const value = JSON.stringify(rows);
        if (value.length < 1000000) localStorage.setItem(CACHE_KEY, value);
      } catch {
        /* Storage quota does not affect live content. */
      }
    }, 3000);
  });
  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}
