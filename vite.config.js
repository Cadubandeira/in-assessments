import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    strictPort: false, // Se 5173 estiver em uso, tenta próxima porta disponível
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          const normalizedId = id.replace(/\\/g, '/');

          if (
            normalizedId.includes('/react/') ||
            normalizedId.includes('/react-dom/') ||
            normalizedId.includes('/scheduler/') ||
            normalizedId.includes('/react-router/') ||
            normalizedId.includes('/react-router-dom/') ||
            normalizedId.includes('/history/') ||
            normalizedId.includes('/@remix-run/') ||
            normalizedId.includes('/@floating-ui/') ||
            normalizedId.includes('/@babel/runtime/') ||
            normalizedId.includes('/prop-types/')
          ) {
            return 'react-vendor';
          }

          if (normalizedId.includes('/@supabase/') || normalizedId.includes('/supabase/')) {
            return 'supabase';
          }

          if (normalizedId.includes('/@tiptap/') || normalizedId.includes('/prosemirror/')) {
            return 'editor';
          }

          if (
            normalizedId.includes('/recharts/') ||
            normalizedId.includes('/d3/') ||
            normalizedId.includes('/victory/') ||
            normalizedId.includes('/echarts/')
          ) {
            return 'charts';
          }

          if (normalizedId.includes('/lucide-react/')) {
            return 'icons';
          }
        },
      },
    },
  },
})