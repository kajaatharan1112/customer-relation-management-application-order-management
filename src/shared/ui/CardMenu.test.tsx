import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pencil, Trash2 } from 'lucide-react'
import { CardMenu } from '@/shared/ui/CardMenu'

describe('CardMenu', () => {
  it('opens on click, wires item clicks, and closes the menu afterward', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <CardMenu
        label="Actions for Thing"
        items={[
          { label: 'Edit', icon: Pencil, onClick: onEdit },
          { label: 'Delete', icon: Trash2, tone: 'danger', onClick: onDelete },
        ]}
      />,
    )

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Thing' }))
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('stops the trigger click from bubbling to a parent onClick', async () => {
    const onCardClick = vi.fn()
    const onEdit = vi.fn()
    render(
      <div onClick={onCardClick}>
        <CardMenu label="Actions" items={[{ label: 'Edit', icon: Pencil, onClick: onEdit }]} />
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }))
    expect(onCardClick).not.toHaveBeenCalled()
  })

  it('closes on Escape', async () => {
    render(<CardMenu label="Actions" items={[{ label: 'Edit', icon: Pencil, onClick: () => {} }]} />)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
