import { LogOut } from 'lucide-react'
import { authService } from '@/core/auth/auth.service'

interface TopBarProps {
  title: string
  withSidebarOffset?: boolean
}

export function TopBar({ title, withSidebarOffset = false }: TopBarProps) {
  return (
    <header
      className={cnHeader(withSidebarOffset)}
    >
      <h2 className="text-base font-bold tracking-tight text-white">{title}</h2>
      <button
        type="button"
        onClick={() => authService.signOut()}
        title="Sign out"
        aria-label="Sign out"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-[var(--color-neo-danger)]"
      >
        <LogOut size={17} />
      </button>
    </header>
  )
}

function cnHeader(withSidebarOffset: boolean) {
  return [
    'fixed left-0 right-0 top-0 z-40 flex h-[64px] items-center justify-between',
    'border-b border-white/10 bg-[var(--color-neo-text-primary)] px-5 shadow-sm',
    withSidebarOffset ? 'md:left-[72px]' : '',
  ].join(' ')
}
