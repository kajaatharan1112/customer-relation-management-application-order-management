import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { RoleRoute } from '@/app/router/RoleRoute'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { PortalLayout } from '@/layouts/PortalLayout'
import { ROUTES } from '@/shared/constants/routes'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))
const VerifyOtpPage = lazy(() => import('@/features/auth/VerifyOtpPage'))
const OAuthCallbackPage = lazy(() => import('@/features/auth/OAuthCallbackPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const SalesPage = lazy(() => import('@/features/dashboard/SalesPage'))
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage'))
const BillsPage = lazy(() => import('@/features/bills/BillsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const HomePage = lazy(() => import('@/features/home/HomePage'))
const PortalHomePage = lazy(() => import('@/features/portal/PortalHomePage'))
const PortalBillPage = lazy(() => import('@/features/portal/PortalBillPage'))

function RouteFallback() {
  return (
    <p className="p-6 text-sm text-[var(--color-neo-text-secondary)] md:p-8">Loading…</p>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
          <Route path={ROUTES.verifyEmail} element={<VerifyOtpPage />} />
        </Route>
        <Route path={ROUTES.authCallback} element={<OAuthCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allow="staff" />}>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.home} element={<HomePage />} />
              <Route path={ROUTES.dashboard} element={<DashboardPage />} />
              <Route path={ROUTES.customers} element={<CustomersPage />} />
              <Route path={ROUTES.bills} element={<BillsPage />} />
              <Route path={ROUTES.billDetail} element={<BillsPage />} />
              <Route path={ROUTES.sales} element={<SalesPage />} />
              <Route element={<RoleRoute allow="admin" />}>
                <Route path={ROUTES.settings} element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route element={<RoleRoute allow="customer" />}>
            <Route element={<PortalLayout />}>
              <Route path={ROUTES.portalHome} element={<HomePage />} />
              <Route path={ROUTES.portalBills} element={<PortalHomePage />} />
              <Route path={ROUTES.portalBill} element={<PortalBillPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
