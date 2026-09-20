import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Home } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { ROUTES } from '@/shared/constants/routes'

export function BackHomeBar({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  return (
    <nav
      className={cn(
        'fixed inset-x-3 z-40 flex h-16 items-center gap-1 rounded-[var(--radius-neo-pill)] px-2 md:hidden',
        'border border-white/60 bg-[var(--color-neo-card)]/60',
        'shadow-[0_4px_16px_rgba(43,45,66,0.12)] backdrop-blur-[22px] backdrop-saturate-[1.85]',
        '[bottom:calc(16px+env(safe-area-inset-bottom,0px))]',
      )}
      style={{ boxShadow: '0 4px 16px rgba(43,45,66,0.12), inset 0 1px 0 rgba(255,255,255,0.85)' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] py-1.5 text-[10px] font-semibold text-[var(--color-neo-text-secondary)] transition-colors active:bg-[var(--color-neo-primary)]/16 active:text-[var(--color-neo-primary)]"
      >
        <ChevronLeft size={20} />
        Back
      </button>
      <button
        type="button"
        onClick={() => navigate(ROUTES.home)}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] py-1.5 text-[10px] font-semibold text-[var(--color-neo-text-secondary)] transition-colors active:bg-[var(--color-neo-primary)]/16 active:text-[var(--color-neo-primary)]"
      >
        <Home size={20} />
        Home
      </button>
    </nav>
  )
}
