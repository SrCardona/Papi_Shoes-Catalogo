import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

/**
 * Dominio del sitio publicado, para el desarrollo local.
 *
 * En desarrollo no existen las funciones de `/api`, así que se reenvían al sitio
 * publicado: el panel local lee y escribe los datos de verdad, y un repositorio
 * recién clonado ve el catálogo al día sin importar ningún respaldo.
 *
 * No es un secreto —es la dirección pública del sitio—, así que puede quedar
 * escrita acá. La variable `VITE_API_ORIGIN` en un `.env` tiene prioridad, para
 * apuntar a un despliegue de prueba sin tocar el código.
 */
const ORIGEN_API_POR_DEFECTO = 'https://papi-shoes-catalogo.vercel.app';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const origenApi = (env.VITE_API_ORIGIN || ORIGEN_API_POR_DEFECTO).replace(
    /\/+$/,
    '',
  );

  /* El reenvío se hace desde el servidor de Vite y no desde el navegador para no
     tener que abrir CORS en las funciones: para el navegador todo sigue siendo
     el mismo origen. */
  const proxy = origenApi
    ? { '/api': { target: origenApi, changeOrigin: true } }
    : undefined;

  return {
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
      proxy,
    },
    preview: { proxy },
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
  };
});
