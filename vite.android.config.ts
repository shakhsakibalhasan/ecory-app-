import { readFileSync } from "node:fs";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig(({ mode }) => {
  const publicConfig = JSON.parse(readFileSync(new URL("./android-public-config.json", import.meta.url), "utf8"));
  const env = { ...publicConfig, ...loadEnv(mode, process.cwd(), "VITE_") };
  for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    if (!(env[name] || process.env[name])) throw new Error(`Android build requires ${name}. Configure public Supabase settings before building.`);
  }
  return {
  // The XML sitemap is a server-only endpoint. Including it in the native SPA
  // imports Start's Node AsyncLocalStorage runtime and crashes before React mounts.
  plugins: [tanstackRouter({target:"react",autoCodeSplitting:true,routeFileIgnorePattern:"sitemap"}), react(), tailwindcss(), tsconfigPaths()],
  define: Object.fromEntries(["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].map(name => [`import.meta.env.${name}`, JSON.stringify(process.env[name] || env[name])])),
  build: { outDir: "dist-android", emptyOutDir: true, rollupOptions: { input: "mobile/index.html" } },
  };
});
