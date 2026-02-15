import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/in-assessments/',
  server: {
    port: 5173,
    strictPort: false, // Se 5173 estiver em uso, tenta próxima porta disponível
  },
})