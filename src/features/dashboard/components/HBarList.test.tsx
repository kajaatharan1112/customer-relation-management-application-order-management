import { render, screen } from '@testing-library/react'
import { HBarList } from '@/features/dashboard/components/HBarList'

it('renders a row per item with a short-formatted value', () => {
  render(<HBarList items={[{ name: 'Printing', value: 2_100_000 }, { name: 'Design', value: 980_000 }]} />)
  expect(screen.getByText('Printing')).toBeInTheDocument()
  expect(screen.getByText('LKR 2.1M')).toBeInTheDocument()
  expect(screen.getByText('LKR 980k')).toBeInTheDocument()
})
