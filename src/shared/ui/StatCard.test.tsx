import { render, screen } from '@testing-library/react'
import { TrendingUp } from 'lucide-react'
import { StatCard } from '@/shared/ui/StatCard'

it('renders label, value, positive delta and sub', () => {
  render(
    <StatCard label="Outstanding" value="LKR 412k" icon={TrendingUp} deltaPct={7} sub="7 bills" spark={[1, 2, 3]} />,
  )
  expect(screen.getByText('Outstanding')).toBeInTheDocument()
  expect(screen.getByText('LKR 412k')).toBeInTheDocument()
  expect(screen.getByText('+7%')).toBeInTheDocument()
  expect(screen.getByText('7 bills')).toBeInTheDocument()
})

it('shows a negative delta with a minus sign', () => {
  render(<StatCard label="Collection" value="72%" icon={TrendingUp} deltaPct={-3} />)
  expect(screen.getByText('-3%')).toBeInTheDocument()
})

it('dense renders the value, label and sub', () => {
  render(<StatCard dense label="In progress" value="9" icon={TrendingUp} sub="3 due this week" />)
  expect(screen.getByText('9')).toBeInTheDocument()
  expect(screen.getByText('In progress')).toBeInTheDocument()
  expect(screen.getByText('3 due this week')).toBeInTheDocument()
})

it('renders no delta text when neither deltaPct nor spark is passed', () => {
  render(<StatCard label="X" value="5" icon={TrendingUp} />)
  expect(screen.queryByText('0%')).toBeNull()
  expect(screen.queryByText(/\d+%/)).toBeNull()
})
