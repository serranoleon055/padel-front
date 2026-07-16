import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLayout } from '@/app/layouts/AdminLayout'
import { PublicLayout } from '@/app/layouts/PublicLayout'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { ScrollToTop } from '@/app/router/ScrollToTop'

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const EstadisticasPage = lazy(() => import('@/pages/admin/EstadisticasPage'))
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const LoginPage = lazy(() => import('@/pages/public/LoginPage'))
const RankingPage = lazy(() => import('@/pages/public/RankingPage'))
const PlayerProfilePage = lazy(() => import('@/pages/public/PlayerProfilePage'))
const PlayerMatchesPage = lazy(() => import('@/pages/public/PlayerMatchesPage'))
const PlayerTournamentsPage = lazy(() => import('@/pages/public/PlayerTournamentsPage'))
const TournamentDetailPage = lazy(() => import('@/pages/public/TournamentDetailPage'))
const TournamentsPage = lazy(() => import('@/pages/public/TournamentsPage'))
const CampeonesPage = lazy(() => import('@/pages/public/CampeonesPage'))
const ReglasPage = lazy(() => import('@/pages/public/ReglasPage'))
const ResultadosPage = lazy(() => import('@/pages/public/ResultadosPage'))
const ResultadosTorneoPage = lazy(() => import('@/pages/public/ResultadosTorneoPage'))
const ContactoPage = lazy(() => import('@/pages/public/legal/ContactoPage'))
const PreciosPage = lazy(() => import('@/pages/public/PreciosPage'))
const SedePage = lazy(() => import('@/pages/public/SedePage'))
const TerminosPage = lazy(() => import('@/pages/public/legal/TerminosPage'))
const PrivacidadPage = lazy(() => import('@/pages/public/legal/PrivacidadPage'))
const PlayersPage = lazy(() => import('@/pages/admin/PlayersPage'))
const CategoriesPage = lazy(() => import('@/pages/admin/CategoriesPage'))
const PlacesPage = lazy(() => import('@/pages/admin/PlacesPage'))
const SeasonsPage = lazy(() => import('@/pages/admin/SeasonsPage'))
const TournamentsAdminPage = lazy(() => import('@/pages/admin/TournamentsAdminPage'))
const TournamentFormPage = lazy(() => import('@/pages/admin/TournamentFormPage'))
const TournamentAdminDetailPage = lazy(() => import('@/pages/admin/TournamentAdminDetailPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const FormatTemplatesPage = lazy(() => import('@/pages/admin/FormatTemplatesPage'))
const PointTemplatesPage = lazy(() => import('@/pages/admin/PointTemplatesPage'))
const ReservarPage = lazy(() => import('@/pages/public/ReservarPage'))
const TurnosAdminPage = lazy(() => import('@/pages/admin/TurnosAdminPage'))
const InscribirmePage = lazy(() => import('@/pages/public/InscribirmePage'))
const PagoResultadoPage = lazy(() => import('@/pages/public/PagoResultadoPage'))
const InscripcionesAdminPage = lazy(() => import('@/pages/admin/InscripcionesAdminPage'))
const ConfiguracionSedePage = lazy(() => import('@/pages/admin/ConfiguracionSedePage'))

function PageFallback() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-rp-accent border-t-transparent" />
        <p className="text-sm text-rp-muted">Cargando...</p>
      </div>
    </div>
  )
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="torneos" element={<TournamentsPage />} />
          <Route path="torneos/:torneoId" element={<TournamentDetailPage />} />
          <Route path="torneos/:torneoId/resultados" element={<ResultadosTorneoPage />} />
          <Route path="torneos/:torneoId/inscribirme" element={<InscribirmePage />} />
          <Route path="torneos/:torneoId/pago/resultado" element={<PagoResultadoPage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="campeones" element={<CampeonesPage />} />
          <Route path="reglas" element={<ReglasPage />} />
          <Route path="resultados" element={<ResultadosPage />} />
          <Route path="reservar" element={<ReservarPage />} />
          <Route path="reservar/pago/resultado" element={<PagoResultadoPage />} />
          <Route path="precios" element={<PreciosPage />} />
          <Route path="la-sede" element={<SedePage />} />
          <Route path="jugadores/:jugadorId" element={<PlayerProfilePage />} />
          <Route path="jugadores/:jugadorId/partidos" element={<PlayerMatchesPage />} />
          <Route path="jugadores/:jugadorId/torneos" element={<PlayerTournamentsPage />} />
          <Route path="contacto" element={<ContactoPage />} />
          <Route path="terminos" element={<TerminosPage />} />
          <Route path="privacidad" element={<PrivacidadPage />} />
          <Route path="login" element={<LoginPage />} />
        </Route>

        <Route path="admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="estadisticas" element={<EstadisticasPage />} />
          <Route path="jugadores" element={<PlayersPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="lugares" element={<PlacesPage />} />
          <Route path="turnos" element={<TurnosAdminPage />} />
          <Route path="temporadas" element={<SeasonsPage />} />
          <Route path="torneos" element={<TournamentsAdminPage />} />
          <Route path="torneos/nuevo" element={<TournamentFormPage />} />
          <Route path="torneos/:torneoId/editar" element={<TournamentFormPage />} />
          <Route path="torneos/:torneoId" element={<TournamentAdminDetailPage />} />
          <Route path="torneos/:torneoId/inscripciones" element={<InscripcionesAdminPage />} />
          <Route path="plantillas-formato" element={<FormatTemplatesPage />} />
          <Route path="plantillas-puntos" element={<PointTemplatesPage />} />
          <Route path="usuarios-admin" element={<AdminUsersPage />} />
          <Route path="configuracion" element={<ConfiguracionSedePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
