export const ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  authCallback: '/auth/callback',
  home: '/home',
  dashboard: '/',
  customers: '/customers',
  bills: '/bills',
  sales: '/sales',
  billDetail: '/bills/:id',
  settings: '/settings',
  portalHome: '/portal',
  portalBills: '/portal/bills',
  portalBill: '/portal/bills/:id',
} as const

export type RouteKey = keyof typeof ROUTES
