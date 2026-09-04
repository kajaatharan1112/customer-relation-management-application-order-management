import { ProfileMenu } from '@/features/profile/components/ProfileMenu'

interface TopBarProps {
  title: string
  withSidebarOffset?: boolean
}

export function TopBar({ title, withSidebarOffset = false }: TopBarProps) {
  return (
    <header className={cnHeader(withSidebarOffset)}>
      <h2 className="text-base font-bold tracking-tight text-white">{title}</h2>
      <ProfileMenu />
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
