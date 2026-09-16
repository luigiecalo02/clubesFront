import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './admin/AdminLayout'
import { ADMIN_MENU } from './admin/menu'
import { RequireAuth } from './admin/RequireAuth'
import { RequirePermission } from './admin/RequirePermission'
import { AuthProvider } from './auth/AuthProvider'
import { ContextPage } from './pages/ContextPage'
import { DashboardPage } from './pages/DashboardPage'
import { ActivateAccountPage } from './pages/ActivateAccountPage'
import { ConfirmAccountPage } from './pages/ConfirmAccountPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ModulePage } from './pages/ModulePage'
import { AttendancePage } from './pages/AttendancePage'
import { EventsPage } from './pages/EventsPage'
import { MembersPage } from './pages/MembersPage'
import { MyClubPage } from './pages/MyClubPage'
import { SettingsPage } from './pages/SettingsPage'
import { ClubesSettingsProvider } from './settings/ClubesSettingsProvider'

export default function App() {
  return (
    <AuthProvider>
      <ClubesSettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/:orgId" element={<LoginPage />} />
            <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
            <Route path="/confirmar-cuenta" element={<ConfirmAccountPage />} />
            <Route path="/activar" element={<ActivateAccountPage />} />
            <Route
              path="/contexto"
              element={
                <div className="app-shell">
                  <ContextPage />
                </div>
              }
            />
            <Route element={<RequireAuth />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route
                  path="/configuracion"
                  element={
                    <RequirePermission permission="settings.view" requireOrgSettings>
                      <SettingsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/mi-club"
                  element={
                    <RequirePermission permission="mi_club.view">
                      <MyClubPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/eventos"
                  element={
                    <RequirePermission permission="events.view">
                      <EventsPage />
                    </RequirePermission>
                  }
                />
                <Route path="/cronograma" element={<Navigate to="/eventos?vista=cronograma" replace />} />
                <Route
                  path="/asistencia"
                  element={
                    <RequirePermission permission="asistencia.view" requireAttendance>
                      <AttendancePage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/integrantes"
                  element={
                    <RequirePermission permission="integrantes.view">
                      <MembersPage />
                    </RequirePermission>
                  }
                />
                {ADMIN_MENU.filter(
                  (item) =>
                    item.path !== '/' &&
                    item.path !== '/configuracion' &&
                    item.path !== '/mi-club' &&
                    item.path !== '/eventos' &&
                    item.path !== '/asistencia' &&
                    item.path !== '/integrantes',
                ).map(
                  (item) => (
                    <Route
                      key={item.path}
                      path={item.path}
                      element={
                        <RequirePermission permission={item.permission}>
                          <ModulePage item={item} />
                        </RequirePermission>
                      }
                    />
                  ),
                )}
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ClubesSettingsProvider>
    </AuthProvider>
  )
}
