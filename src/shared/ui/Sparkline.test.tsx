import { render } from '@testing-library/react'
import { Sparkline } from '@/shared/ui/Sparkline'

it('draws a polyline for >= 2 points and nothing for fewer', () => {
  const { container, rerender } = render(<Sparkline values={[1, 4, 2, 6]} />)
  expect(container.querySelector('polyline')).not.toBeNull()
  rerender(<Sparkline values={[3]} />)
  expect(container.querySelector('polyline')).toBeNull()
})
