import type { ReactNode } from 'react'

/** Right-aligned button row for a <Modal>'s `footer` slot. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-3">{children}</div>
}
