import { render, screen } from '@testing-library/react'
import { StatusBreakdownBar } from '@/features/dashboard/components/StatusBreakdownBar'

it('lists bucket counts and overdue separately', () => {
  render(<StatusBreakdownBar open={7} active={9} done={28} overdue={1} />)
  expect(screen.getByText('7')).toBeInTheDocument()
  expect(screen.getByText('9')).toBeInTheDocument()
  expect(screen.getByText('28')).toBeInTheDocument()
  expect(screen.getByText(/1 overdue/i)).toBeInTheDocument()
})
