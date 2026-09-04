import type { ReactNode } from 'react'

/** One column on mobile, two on desktop. Children are <Field>/<Select>; pass
 *  `full` on a child to make it span both columns. */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">{children}</div>
}
