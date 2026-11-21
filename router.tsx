import { restorePublicQueries } from "./lib/public-query-cache";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({defaultOptions:{queries:{staleTime:30000,gcTime:600000,retry:0,networkMode:"always",refetchIntervalInBackground:false}}});

  restorePublicQueries(queryClient);
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

