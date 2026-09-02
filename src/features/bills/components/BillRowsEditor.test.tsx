import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillRowsEditor } from '@/features/bills/components/BillRowsEditor'

const orderTypes = [{ id: 'ot1', name: 'Printing', fixedAmount: 250 }]

describe('BillRowsEditor', () => {
  it('adds a row and shows a live total', async () => {
    const onChange = vi.fn()
    const rows = [{ detail: 'A', orderTypeId: null, amount: 100 }]
    const { rerender } = render(
      <BillRowsEditor rows={rows} orderTypes={orderTypes} onChange={onChange} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /add row/i }))
    expect(onChange).toHaveBeenCalledWith([...rows, { detail: '', orderTypeId: null, amount: 0 }])
    rerender(
      <BillRowsEditor
        rows={[
          { detail: 'A', orderTypeId: null, amount: 100 },
          { detail: 'B', orderTypeId: null, amount: 50 },
        ]}
        orderTypes={orderTypes}
        onChange={onChange}
      />,
    )
    expect(screen.getByText(/150/)).toBeInTheDocument()
  })

  it('picking an order type fills a zero amount but not a typed one', async () => {
    const onChange = vi.fn()
    render(
      <BillRowsEditor
        rows={[{ detail: 'A', orderTypeId: null, amount: 0 }]}
        orderTypes={orderTypes}
        onChange={onChange}
      />,
    )
    await userEvent.selectOptions(screen.getByLabelText(/row 1 order type/i), 'ot1')
    expect(onChange).toHaveBeenCalledWith([{ detail: 'A', orderTypeId: 'ot1', amount: 250 }])
  })
})
