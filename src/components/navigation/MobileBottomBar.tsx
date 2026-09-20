import { useRole } from '@/core/auth/auth.hooks'
import { mobileNavFor } from '@/components/navigation/navConfig'
import { NavPillBar } from '@/components/navigation/NavPillBar'

export function MobileBottomBar() {
  const { isAdmin } = useRole()
  return <NavPillBar items={mobileNavFor(isAdmin)} />
}
