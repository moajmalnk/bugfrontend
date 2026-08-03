import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
function patchPwaManifestFile(manifestPath: string, origin: string) {
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const base = `${origin}/`;
  manifest.id = base;
  manifest.start_url = base;
  manifest.scope = base;
  if (manifest.share_target) {
    manifest.share_target.action = `${origin}/share-target`;
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function vendorManualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  // Why: do NOT force recharts/d3 into a shared chunk — their circular imports
  // cause "Cannot access 'X' before initialization" at runtime.
  if (id.includes("firebase")) return "firebase";
  if (
    id.includes("jspdf") ||
    id.includes("@react-pdf") ||
    id.includes("pdfkit")
  ) {
    return "pdf";
  }
  if (id.includes("framer-motion") || id.includes("@radix-ui")) {
    return "ui-vendor";
  }
  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("react-router") ||
    id.includes("scheduler")
  ) {
    return "react-vendor";
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET?.replace(/\/$/, "") ||
    "https://bugbackend.bugricer.com";
  const isProd = mode === "production";

  return {
    server: {
      host: "::",
      port: 8080,
      strictPort: true,
      hmr: {
        overlay: true,
      },
      fs: {
        strict: false,
      },
      headers: {
        "Cache-Control": "no-cache",
      },
      middlewareMode: false,
      cors: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
      watch: {
        usePolling: false,
        interval: 100,
      },
    },
    plugins: [
      react({
        plugins: [],
      }),
      {
        name: "patch-pwa-manifest",
        closeBundle() {
          const origin =
            env.VITE_PWA_ORIGIN?.replace(/\/$/, "") ||
            "https://bugs.bugricer.com";
          patchPwaManifestFile(
            path.resolve(__dirname, "dist/manifest.json"),
            origin
          );
        },
      },
      ...(isProd
        ? [
            viteCompression({
              algorithm: "gzip",
              ext: ".gz",
              threshold: 1024,
            }),
            viteCompression({
              algorithm: "brotliCompress",
              ext: ".br",
              threshold: 1024,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@radix-ui/react-dialog",
        "@radix-ui/react-tooltip",
        "@radix-ui/react-checkbox",
        "@radix-ui/react-tabs",
        "@radix-ui/react-toast",
        "@radix-ui/react-select",
        "@radix-ui/react-slot",
        "@radix-ui/react-separator",
        "@radix-ui/react-scroll-area",
        "@tanstack/react-query",
        "framer-motion",
        "lucide-react",
        "axios",
      ],
      exclude: ["@radix-ui/react-slider"],
      esbuildOptions: {
        target: "esnext",
      },
    },
    build: {
      outDir: "dist",
      sourcemap: mode === "development",
      minify: mode === "production" ? "esbuild" : false,
      cssMinify: mode === "production",
      rollupOptions:
        mode === "development"
          ? {
              output: {
                manualChunks: undefined,
                chunkFileNames: "assets/[name].js",
                entryFileNames: "assets/[name].js",
              },
            }
          : {
              output: {
                manualChunks: vendorManualChunks,
                chunkFileNames: "assets/[name]-[hash].js",
                entryFileNames: "assets/[name]-[hash].js",
                assetFileNames: (assetInfo) => {
                  if (!assetInfo.name) return "assets/[name]-[hash].[ext]";
                  const info = assetInfo.name.split(".");
                  const ext = info[info.length - 1];
                  if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
                    return `assets/images/[name]-[hash].${ext}`;
                  }
                  if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
                    return `assets/fonts/[name]-[hash].${ext}`;
                  }
                  return `assets/[name]-[hash].${ext}`;
                },
                format: "es",
                banner:
                  mode === "production"
                    ? "/* BugRicer Meeting Room - Production Build */"
                    : undefined,
              },
            },
      chunkSizeWarningLimit: 700,
      target: "esnext",
      cssCodeSplit: true,
      modulePreload: {
        polyfill: true,
        // Why: keep heavy vendor chunks out of cold-load preload so first paint stays lean
        resolveDependencies: (_filename, deps) =>
          deps.filter(
            (dep) => !dep.includes("pdf-") && !dep.includes("firebase-")
          ),
      },
      assetsInlineLimit: 4096,
      assetsDir: "assets",
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
    css: {
      devSourcemap: mode === "development",
      modules: {
        localsConvention: "camelCase",
      },
    },
    esbuild:
      mode === "production"
        ? {
            treeShaking: true,
            target: "esnext",
          }
        : undefined,
    define: {
      global: "globalThis",
      __APP_VERSION__: JSON.stringify(
        process.env.npm_package_version || "1.0.0"
      ),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
