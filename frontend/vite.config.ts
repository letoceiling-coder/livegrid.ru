/**
 * Vite configuration — livegrid.ru frontend.
 *
 * Key decisions:
 *   - base: "/"          Абсолютные пути к ассетам. Требуется для SPA served from Nginx root.
 *   - outDir: "dist"     Стандартный output, Nginx читает из frontend/dist/.
 *   - sourcemap: false   Не раскрываем исходники в production.
 *   - manualChunks       Разбивка на chunks по библиотекам для лучшего кэширования.
 *   - lovable-tagger     Подключается только в mode=development (не попадает в production bundle).
 *
 * Build команда: npm run build
 * Dev команда:   npm run dev  (порт 8080, hmr.overlay=false)
 *
 * @see https://vitejs.dev/config/
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// lovable-tagger только в development (не нужен в production build)
const getPlugins = async (mode: string) => {
  const plugins = [react()];
  if (mode === "development") {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger() as any);
    } catch {
      // lovable-tagger не установлен — игнорируем
    }
  }
  return plugins;
};

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => ({
  base: "/",

  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Chunk splitting для лучшей кэшируемости
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select"],
          query: ["@tanstack/react-query"],
          motion: ["framer-motion"],
        },
      },
    },
  },

  plugins: await getPlugins(mode),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
