import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { RoleRoute } from '@/app/router/RoleRoute'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { PortalLayout } from '@/layouts/PortalLayout'
import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import OAuthCallbackPage from '@/features/auth/OAuthCallbackPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import CustomersPage from '@/features/customers/CustomersPage'
import BillsPage from '@/features/bills/BillsPage'
import BillDetailPage from '@/features/bills/BillDetailPage'
import SettingsPage from '@/features/settings/SettingsPage'
import PortalHomePage from '@/features/portal/PortalHomePage'
import PortalBillPage from '@/features/portal/PortalBillPage'
import { ROUTES } from '@/shared/constants/routes'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        </Route>
        <Route path={ROUTES.authCallback} element={<OAuthCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allow="staff" />}>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.dashboard} element={<DashboardPage />} />
              <Route path={ROUTES.customers} element={<CustomersPage />} />
              <Route path={ROUTES.bills} element={<BillsPage />} />
              <Route path={ROUTES.billDetail} element={<BillDetailPage />} />
              <Route path={ROUTES.settings} element={<SettingsPage />} />
            </Route>
          </Route>
          <Route element={<RoleRoute allow="customer" />}>
            <Route element={<PortalLayout />}>
              <Route path={ROUTES.portalHome} element={<PortalHomePage />} />
              <Route path={ROUTES.portalBill} element={<PortalBillPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
