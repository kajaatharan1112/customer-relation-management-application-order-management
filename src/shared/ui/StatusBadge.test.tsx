import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/shared/ui/StatusBadge'

describe('StatusBadge', () => {
  it('renders the label', () => {
    render(<StatusBadge label="Pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })
})
