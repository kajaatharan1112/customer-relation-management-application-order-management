import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowList } from '@/features/settings/components/WorkflowList'
import type { WorkflowStageVM, WorkflowTemplateVM } from '@/features/settings/settings.types'

const stages: WorkflowStageVM[] = [
  { id: 's1', name: 'Draft', sortOrder: 0, color: '#ff0000', isFinal: false },
  { id: 's2', name: 'Printing', sortOrder: 1, color: '#00ff00', isFinal: false },
  { id: 's3', name: 'Delivered', sortOrder: 2, color: '#0000ff', isFinal: true },
]

const templates: WorkflowTemplateVM[] = [
  { id: 't1', name: 'Standard Print', description: 'How a print order flows', isActive: true, stages },
  { id: 't2', name: 'Rush Job', description: null, isActive: false, stages: [] },
]

describe('WorkflowList', () => {
  it('renders a card per template with name, badges and description', () => {
    render(<WorkflowList templates={templates} canWrite={false} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Standard Print')).toBeInTheDocument()
    expect(screen.getByText('Rush Job')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByText('How a print order flows')).toBeInTheDocument()
  })

  it('renders each stage name and a "No stages" fallback when empty', () => {
    render(<WorkflowList templates={templates} canWrite={false} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Printing')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText(/no stages/i)).toBeInTheDocument()
  })

  it('hides the actions menu and card click when canWrite is false', () => {
    render(<WorkflowList templates={templates} canWrite={false} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByRole('button', { name: /actions for/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Standard Print' })).not.toBeInTheDocument()
  })

  it('clicking the card calls onEdit', async () => {
    const onEdit = vi.fn()
    render(<WorkflowList templates={[templates[0]!]} canWrite onEdit={onEdit} onDelete={() => {}} />)
    await userEvent.click(screen.getByText('Standard Print'))
    expect(onEdit).toHaveBeenCalledWith(templates[0])
  })

  it('wires the Delete menu item without triggering onEdit', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<WorkflowList templates={[templates[0]!]} canWrite onEdit={onEdit} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /actions for standard print/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith(templates[0])
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('shows the empty copy when there are no templates', () => {
    render(<WorkflowList templates={[]} canWrite onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/no workflows/i)).toBeInTheDocument()
  })
})
