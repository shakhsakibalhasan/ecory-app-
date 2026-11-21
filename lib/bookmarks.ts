import { useSyncExternalStore } from "react";

// Article bookmarks — kept separate from saved products (favourites).
const KEY = "ecory-article-bookmarks";
const listeners = new Set<() => void>();
let cache: string[] | null = null;
const read = (): string[] => {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { cache = []; }
  return cache!;
};
const EMPTY: string[] = [];
export function useBookmarks() {
  const ids = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, () => EMPTY);
  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    cache = next;
    localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach((l) => l());
  };
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}

export const POST_CATEGORIES = [
  { key: "digestion", bn: "পেট ও হজম", en: "Digestion" },
  { key: "herbs", bn: "পাতা ও ভেষজ", en: "Leaves & herbs" },
  { key: "seeds", bn: "বীজ ও পুষ্টি", en: "Seeds & nutrition" },
  { key: "foods", bn: "প্রাকৃতিক খাবার", en: "Natural foods" },
  { key: "daily", bn: "দৈনন্দিন যত্ন", en: "Daily care" },
] as const;
export const catLabel = (k: string, bn: boolean) => { const c = POST_CATEGORIES.find((x) => x.key === k); return c ? (bn ? c.bn : c.en) : ""; };
export const readMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 180));
