import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    http: {},
    // Force cache busting in development
    hmr: {
      overlay: true,
    },
  },
  plugins: [
    react({
      // Enable SWC optimizations
      plugins: [
        // Add any SWC plugins here
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Force fresh chunks in development
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tooltip',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'axios',
    ],
    exclude: [
      // Exclude heavy dependencies that should be loaded on demand
    ],
  },
  build: {
    outDir: "dist",
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
    cssMinify: mode === 'production',
    // Enhanced chunking strategy for better caching and dependency resolution
    rollupOptions: mode === 'development' ? {
      output: {
        manualChunks: undefined,
      },
    } : {
      output: {
        manualChunks: (id) => {
          // Create more stable chunking strategy for production only
          if (id.includes('node_modules')) {
            // Core React ecosystem - MUST be in the same chunk to prevent dependency issues
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('framer-motion')) {
              return 'react-core';
            }
            // UI Components - depends on React, include in react-core for dependency safety
            if (id.includes('@radix-ui')) {
              return 'react-core';
            }
            // Data fetching and state management
            if (id.includes('@tanstack') || id.includes('axios')) {
              return 'data-vendor';
            }
            // Icons and utilities
            if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            // Charts and visualization
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            // Forms and validation
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
              return 'forms-vendor';
            }
            // Firebase and external services
            if (id.includes('firebase') || id.includes('@supabase')) {
              return 'services-vendor';
            }
            // Everything else
            return 'vendor';
          }
          
          // Split by feature for better caching
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1]?.split('/')[0];
            if (pageName) {
              return `page-${pageName}`;
            }
          }
          
          // Components depend on React, so include them in react-core to ensure proper loading order
          if (id.includes('/components/')) {
            return 'react-core';
          }
        },
        // Ensure proper chunk loading order
        chunkFileNames: (chunkInfo) => {
          // React core should load first
          if (chunkInfo.name === 'react-core') {
            return 'assets/00-react-core-[hash].js';
          }
          // Then other vendor chunks
          if (chunkInfo.name && chunkInfo.name.includes('vendor')) {
            return 'assets/01-[name]-[hash].js';
          }
          // Then components and pages
          return 'assets/[name]-[hash].js';
        },
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
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable tree shaking
    treeshake: {
      moduleSideEffects: false,
    },
    // Target modern browsers for better performance
    target: 'esnext',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Ensure proper module format and MIME types
    modulePreload: {
      polyfill: true,
    },
    // Ensure proper MIME types for production
    assetsInlineLimit: 4096,
    // Better chunk naming for debugging
    assetsDir: 'assets',
  },
  // Enhanced CSS handling
  css: {
    devSourcemap: mode === 'development',
    modules: {
      localsConvention: 'camelCase',
    },
  },
  // Performance optimizations
  ...(mode === 'production' && {
    esbuild: {
      // Enable tree shaking
      treeShaking: true,
      // Target modern browsers
      target: 'esnext',
    },
  }),
  // Define global constants and ensure proper module resolution
  define: {
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}));
