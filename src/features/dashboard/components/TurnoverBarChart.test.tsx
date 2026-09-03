import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { TurnoverBarChart } from '@/features/dashboard/components/TurnoverBarChart'

vi.mock('recharts', async (io) => {
  const actual = await io<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
    <div style={{ width: 400, height: 200 }}>
      {React.cloneElement(children as React.ReactElement<Record<string, number>>, { width: 400, height: 200 })}
    </div>
  ) }
})

it('renders an svg for real data and an empty state for all-zero', () => {
  const { container, rerender } = render(
    <TurnoverBarChart data={[{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }]} />,
  )
  expect(container.querySelector('svg')).not.toBeNull()
  rerender(<TurnoverBarChart data={[{ label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }]} />)
  expect(screen.getByText(/no sales/i)).toBeInTheDocument()
})
