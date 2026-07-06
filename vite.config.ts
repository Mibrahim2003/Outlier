import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
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
