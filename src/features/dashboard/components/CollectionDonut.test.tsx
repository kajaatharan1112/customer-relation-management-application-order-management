import { render, screen } from '@testing-library/react'
import { CollectionDonut } from '@/features/dashboard/components/CollectionDonut'

vi.mock('recharts', async (io) => {
  const actual = await io<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
    <div style={{ width: 200, height: 200 }}>{children}</div>
  ) }
})

it('shows the collected percentage', () => {
  render(<CollectionDonut collected={72} outstanding={28} />)
  expect(screen.getByText('72%')).toBeInTheDocument()
})
it('empty state when nothing billed', () => {
  render(<CollectionDonut collected={0} outstanding={0} />)
  expect(screen.getByText(/no billed value/i)).toBeInTheDocument()
})
