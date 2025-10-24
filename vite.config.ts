import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
    fs: {
      strict: false,
    },
    // Add headers to help with chunk loading
    headers: {
      'Cache-Control': 'no-cache',
    },
    // Force reload on chunk errors
    force: true,
    // Improve chunk loading reliability
    middlewareMode: false,
    cors: true,
    // Better handling of dynamic imports
    watch: {
      usePolling: false,
      interval: 100,
    },
  },
  plugins: [
    react({
      // Enable SWC optimizations
      plugins: [],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    force: mode === 'development',
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-tabs',
      '@radix-ui/react-card',
      '@radix-ui/react-toast',
      '@radix-ui/react-slider',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-separator',
      '@radix-ui/react-scroll-area',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'axios',
    ],
    // Exclude problematic modules from pre-bundling
    exclude: ['@radix-ui/react-slider'],
    // Improve chunk loading stability
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    outDir: "dist",
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
    cssMinify: mode === 'production',
    // Optimized chunking strategy for production
    rollupOptions: mode === 'development' ? {
      output: {
        manualChunks: undefined,
        // Better chunk naming for development
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js',
      },
    } : {
      output: {
        manualChunks: (id) => {
          // Single chunk strategy for maximum reliability
          if (id.includes('node_modules') || id.includes('/src/')) {
            return 'react-core';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name]-[hash].[ext]';
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
        // Ensure proper module format
        format: 'es',
        // Add proper module type
        banner: mode === 'production' ? '/* BugRicer Meeting Room - Production Build */' : undefined,
      },
    },
    chunkSizeWarningLimit: 3000,
    target: 'esnext',
    cssCodeSplit: true,
    modulePreload: {
      polyfill: true,
    },
    assetsInlineLimit: 4096,
    assetsDir: 'assets',
    // Ensure proper module handling
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  css: {
    devSourcemap: mode === 'development',
    modules: {
      localsConvention: 'camelCase',
    },
  },
  esbuild: mode === 'production' ? {
    treeShaking: true,
    target: 'esnext',
  } : undefined,
  define: {
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}));