import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

describe('neo tokens', () => {
  it('renders an element with the neo background utility', () => {
    const { container } = render(<div className="bg-[var(--color-neo-bg)]">x</div>)
    expect(container.firstChild).toHaveClass('bg-[var(--color-neo-bg)]')
  })
})
