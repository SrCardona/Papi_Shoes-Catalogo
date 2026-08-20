import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { TempleMark } from './components/ui/TempleMark';
import { HomePage } from './pages/HomePage';
import { CatalogPage, OriginalsPage, SneakersPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Vistas pesadas o poco visitadas: se cargan solo cuando hacen falta.
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const FaqPage = lazy(() =>
  import('./pages/FaqPage').then((m) => ({ default: m.FaqPage })),
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);

function RouteFallback() {
  return (
    <div className="min-h-[55vh] flex items-center justify-center">
      <TempleMark className="w-10 h-10 opacity-25 animate-pulse" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AuthProvider>
          <BrowserRouter>
            {/* Una sola vez en toda la app: inyecta el script de Vercel, que se
                engancha al historial y cuenta cada cambio de ruta de la SPA
                como una vista aparte, sin recargar la pagina. */}
            <Analytics />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="catalogo" element={<CatalogPage />} />
                  <Route path="originales" element={<OriginalsPage />} />
                  <Route path="sneakers" element={<SneakersPage />} />
                  {/* La ruta vieja se conserva: los enlaces ya compartidos por
                      WhatsApp o Instagram siguen funcionando. */}
                  <Route
                    path="streetwear"
                    element={<Navigate to="/sneakers" replace />}
                  />
                  <Route path="producto/:id" element={<ProductPage />} />
                  <Route path="nosotros" element={<AboutPage />} />
                  <Route path="preguntas" element={<FaqPage />} />
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}
