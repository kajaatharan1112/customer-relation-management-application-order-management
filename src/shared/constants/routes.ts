export const ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  authCallback: '/auth/callback',
  dashboard: '/',
  customers: '/customers',
  bills: '/bills',
  billDetail: '/bills/:id',
  settings: '/settings',
  portalHome: '/portal',
  portalBill: '/portal/bills/:id',
} as const

export type RouteKey = keyof typeof ROUTES
