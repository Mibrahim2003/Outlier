import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'node:child_process';
import {defineConfig} from 'vite';

// Real build identity, injected at build time. Updates on every commit/build —
// no hand-edited version strings. Falls back gracefully outside a git checkout.
const gitSha = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'local'; }
})();

export default defineConfig(() => {
  return {
    define: {
      __GIT_SHA__: JSON.stringify(gitSha),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          // Split stable vendor libraries into their own cacheable chunks so the
          // app chunk stays under Vite's 500 kB advisory limit.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
            motion: ['motion'],
            icons: ['lucide-react'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
    },
  };
});
