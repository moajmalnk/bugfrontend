import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    http: {},
  },
  plugins: [
    react(),
    splitVendorChunkPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'terser' : false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // UI and styling libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
          // Data management and API
          'data-vendor': [
            '@tanstack/react-query',
            'axios',
            'zod',
            '@hookform/resolvers',
            'react-hook-form',
          ],
          // Charts and visualization
          'charts-vendor': [
            'recharts',
            'jspdf',
            'jspdf-autotable',
          ],
          // Firebase and notifications
          'firebase-vendor': [
            'firebase',
            '@supabase/supabase-js',
          ],
          // Utilities and helpers
          'utils-vendor': [
            'date-fns',
            'framer-motion',
            'lucide-react',
            'react-icons',
            'react-markdown',
            'sonner',
          ],
        },
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      // External dependencies that shouldn't be bundled
      external: mode === 'production' ? [] : [],
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable terser optimizations
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
    } : undefined,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'date-fns',
      'framer-motion',
      'lucide-react',
    ],
    exclude: [
      'firebase',
      '@supabase/supabase-js',
    ],
  },
  // CSS optimization
  css: {
    devSourcemap: mode === 'development',
    postcss: {
      plugins: [
        // Add autoprefixer for better browser compatibility
        require('autoprefixer'),
      ],
    },
  },
  // Define environment variables
  define: {
    __DEV__: mode === 'development',
    __PROD__: mode === 'production',
  },
  // Performance optimizations
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    target: 'es2020',
  },
}));
