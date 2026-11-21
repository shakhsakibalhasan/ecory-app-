import { offlinePublicContent, markPublicOnline } from "./public-query-cache";
import { useQuery as useReactQuery } from "@tanstack/react-query";

export class QueryTimeoutError extends Error {
  constructor() {
    super("Content request timed out. Please retry.");
    this.name = "QueryTimeoutError";
  }
}
export async function boundedQuery<T>(operation: PromiseLike<T>, timeoutMs = 22000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new QueryTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

// Also bounds time waiting for auth/session initialization before fetch even starts.
// Keep React Query's overloads, key sharing, cancellation and previous data semantics.
export const useQuery: typeof useReactQuery = ((options: any, client?: any) => {
  const original = options.queryFn;
  const retry = options.retry;
  return useReactQuery(
    {
      ...options,
      ...(typeof original === "function"
        ? {
            queryFn: async (context: any) => {
              try {
                const value = await boundedQuery(original(context));
                markPublicOnline(context.queryKey);
                return value;
              } catch (error) {
                const cached = offlinePublicContent(context.queryKey);
                if (cached !== undefined) return cached;
                throw error;
              }
            },
          }
        : {}),
      retry: (count: number, error: Error) => {
        if (error instanceof QueryTimeoutError) return false;
        if (typeof retry === "function") return retry(count, error);
        return typeof retry === "number" ? count < retry : retry === true ? count < 1 : false;
      },
    },
    client,
  );
}) as typeof useReactQuery;
