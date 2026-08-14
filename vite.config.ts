import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    watch: {
      /* Los lotes de fotos se copian a la raíz como .zip, y Windows los deja
         bloqueados mientras se escriben. Vite intentaba vigilarlos y el
         servidor se caía con EBUSY a media copia. No son código: no hay nada
         que recargar cuando cambian. */
      ignored: ['**/*.zip'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
