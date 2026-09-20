import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[var(--color-neo-bg)] p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--color-neo-primary)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[var(--color-neo-primary-2)]/20 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-[var(--color-neo-primary)]/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
