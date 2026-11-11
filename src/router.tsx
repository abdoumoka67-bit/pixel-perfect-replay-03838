import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // A full minute for tab data, so switching dashboard pages never refetches.
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        // No surprise reload when the visitor comes back to the browser tab.
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload route code and data on hover/focus/touch before the click lands.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30 * 1000,
  });

  return router;
};
