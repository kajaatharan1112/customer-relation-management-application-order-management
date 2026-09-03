import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'

function Harness() {
  const [v, setV] = useState<'d' | 'm' | 'y'>('m')
  return (
    <>
      <SegmentedControl
        ariaLabel="Range"
        value={v}
        onChange={setV}
        options={[
          { value: 'd', label: 'Daily' },
          { value: 'm', label: 'Monthly' },
          { value: 'y', label: 'Yearly' },
        ]}
      />
      <output>{v}</output>
    </>
  )
}

describe('SegmentedControl', () => {
  it('marks the active option and switches on click', async () => {
    render(<Harness />)
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Yearly' }))
    expect(screen.getByText('y')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Yearly' })).toBeChecked()
  })
})
