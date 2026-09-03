import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrderTypeList } from '@/features/settings/components/OrderTypeList'
import type { OrderTypeVM } from '@/features/settings/settings.types'

const orderTypes: OrderTypeVM[] = [
  { id: 'ot1', name: 'Paper Printing', workflowTemplateId: 't1', workflowName: 'Standard Print', fixedAmount: 1500, isActive: true },
  { id: 'ot2', name: 'Book Binding', workflowTemplateId: 't2', workflowName: 'Rush Job', fixedAmount: null, isActive: false },
]

describe('OrderTypeList', () => {
  it('renders a card per order type with name and status', () => {
    render(<OrderTypeList orderTypes={orderTypes} canWrite={false} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Paper Printing')).toBeInTheDocument()
    expect(screen.getByText('Book Binding')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows the workflow name and the formatted fixed amount', () => {
    render(<OrderTypeList orderTypes={orderTypes} canWrite={false} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Standard Print')).toBeInTheDocument()
    expect(screen.getByText('Rush Job')).toBeInTheDocument()
    expect(screen.getByText(/1,500/)).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('hides the footer actions when canWrite is false', () => {
    render(<OrderTypeList orderTypes={orderTypes} canWrite={false} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('wires Edit and Delete to the handlers with the order type', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<OrderTypeList orderTypes={[orderTypes[0]!]} canWrite onEdit={onEdit} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onEdit).toHaveBeenCalledWith(orderTypes[0])
    expect(onDelete).toHaveBeenCalledWith(orderTypes[0])
  })

  it('shows the empty copy when there are no order types', () => {
    render(<OrderTypeList orderTypes={[]} canWrite onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/no order types/i)).toBeInTheDocument()
  })
})
