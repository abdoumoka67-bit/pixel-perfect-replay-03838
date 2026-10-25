// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Pre-bundle every library used by lazily loaded pages at dev-server start.
    // Without this, opening a page for the first time can make the dev server
    // re-bundle libraries mid-session, and Safari then fails with
    // "Importing a module script failed" (blank screen).
    optimizeDeps: {
      entries: ["src/router.tsx", "src/routes/**/*.tsx", "src/components/**/*.tsx"],
      include: [
        "@tanstack/router-core",
        "@tanstack/router-core/isServer",
        "@tanstack/router-core/ssr/client",
        "seroval",
        "@supabase/supabase-js",
        "sonner",
        "zod",
        "lucide-react",
        "recharts",
      ],
    },
  },
});
