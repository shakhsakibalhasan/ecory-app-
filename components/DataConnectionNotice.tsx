import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { hasOfflineContent, PUBLIC_QUERY_KEYS } from "@/lib/public-query-cache";

export function DataConnectionNotice({ admin = false }: { admin?: boolean }) {
  const client = useQueryClient();
  const { lang } = useStore();
  const subscribe = useCallback(
    (onChange: () => void) => {
      const stop = client.getQueryCache().subscribe(onChange);
      window.addEventListener("ecory-content-status", onChange);
      return () => {
        stop();
        window.removeEventListener("ecory-content-status", onChange);
      };
    },
    [client],
  );
  const snapshot = useCallback(
    () =>
      client
        .getQueryCache()
        .getAll()
        .some(
          (q) =>
            q.getObserversCount() > 0 &&
            (admin
              ? String(q.queryKey[0]).startsWith("admin-")
              : PUBLIC_QUERY_KEYS.has(String(q.queryKey[0]))) &&
            q.state.status === "error",
        ) ||
      (!admin && hasOfflineContent()),
    [client, admin],
  );
  const failed = useSyncExternalStore(subscribe, snapshot, () => false);
  if (!failed) return null;
  return (
    <div
      role="status"
      className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary-soft px-3 py-2 text-xs text-black"
    >
      <span>
        {lang === "bn"
          ? "নতুন তথ্য আনা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।"
          : "Could not refresh content. Check your connection and retry."}
      </span>
      <button
        type="button"
        className="shrink-0 rounded-md bg-primary px-3 py-2 font-semibold text-white"
        onClick={() => void client.refetchQueries({ type: "active" })}
      >
        {lang === "bn" ? "আবার চেষ্টা" : "Retry"}
      </button>
    </div>
  );
}
