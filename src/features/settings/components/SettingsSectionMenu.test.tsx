import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Workflow, Tag } from 'lucide-react'
import { SettingsSectionMenu, type SettingsSection } from '@/features/settings/components/SettingsSectionMenu'

type Key = 'workflows' | 'order-types'

const sections: SettingsSection<Key>[] = [
  { key: 'workflows', title: 'Workflows', description: 'Define how orders move through stages', icon: Workflow },
  { key: 'order-types', title: 'Order Types', description: "What you bill for, and each type's workflow", icon: Tag },
]

describe('SettingsSectionMenu', () => {
  it('renders one row per section with its title and description', () => {
    render(<SettingsSectionMenu<Key> sections={sections} onPick={() => {}} />)
    expect(screen.getByText('Workflows')).toBeInTheDocument()
    expect(screen.getByText('Define how orders move through stages')).toBeInTheDocument()
    expect(screen.getByText('Order Types')).toBeInTheDocument()
    expect(screen.getByText("What you bill for, and each type's workflow")).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('calls onPick with the section key when a row is clicked', async () => {
    const onPick = vi.fn()
    render(<SettingsSectionMenu<Key> sections={sections} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /workflows/i }))
    expect(onPick).toHaveBeenCalledWith('workflows')
    await userEvent.click(screen.getByRole('button', { name: /order types/i }))
    expect(onPick).toHaveBeenCalledWith('order-types')
  })
})
