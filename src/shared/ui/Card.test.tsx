import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardTitle } from '@/shared/ui/Card'

describe('Card', () => {
  it('renders children and default soft variant classes', () => {
    render(<Card data-testid="c">hello</Card>)
    const el = screen.getByTestId('c')
    expect(el).toHaveTextContent('hello')
    expect(el.className).toContain('shadow-[var(--shadow-neo-soft)]')
  })
  it('applies inset variant', () => {
    render(
      <Card data-testid="c" variant="inset">
        x
      </Card>,
    )
    expect(screen.getByTestId('c').className).toContain('shadow-[var(--shadow-neo-pressed)]')
  })
  it('CardTitle renders an h3', () => {
    render(<CardTitle>T</CardTitle>)
    expect(screen.getByRole('heading', { level: 3, name: 'T' })).toBeInTheDocument()
  })
})
