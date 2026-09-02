export interface PlaceholderPageProps {
  title: string
  note?: string
}

export function PlaceholderPage({ title, note = 'Coming in a later phase.' }: PlaceholderPageProps) {
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">{title}</h1>
      <p className="mt-2 text-[var(--color-neo-text-secondary)]">{note}</p>
    </div>
  )
}
