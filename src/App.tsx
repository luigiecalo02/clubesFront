import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './admin/AdminLayout'
import { ADMIN_MENU } from './admin/menu'
import { RequireAuth } from './admin/RequireAuth'
import { RequirePermission } from './admin/RequirePermission'
import { AuthProvider } from './auth/AuthProvider'
import { ContextPage } from './pages/ContextPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ModulePage } from './pages/ModulePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
              {ADMIN_MENU.filter((item) => item.path !== '/').map((item) => (
                <Route
                  key={item.path}
                  path={item.path}
                  element={
                    <RequirePermission permission={item.permission}>
                      <ModulePage item={item} />
                    </RequirePermission>
                  }
                />
              ))}
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
