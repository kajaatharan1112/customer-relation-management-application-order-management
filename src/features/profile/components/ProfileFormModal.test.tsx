import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileFormModal } from '@/features/profile/components/ProfileFormModal'

const h = vi.hoisted(() => ({
  own: { data: { fullName: 'Kaja', phone: '123', email: 'k@x.com' }, isLoading: false },
  updateProfile: vi.fn().mockResolvedValue(undefined),
  changePassword: vi.fn().mockResolvedValue(undefined),
  show: vi.fn(),
}))

vi.mock('@/features/profile/queries/useOwnProfile', () => ({ useOwnProfile: () => h.own }))
vi.mock('@/features/profile/mutations/useUpdateOwnProfile', () => ({
  useUpdateOwnProfile: () => ({ mutateAsync: h.updateProfile, isPending: false }),
}))
vi.mock('@/features/profile/mutations/useChangePassword', () => ({
  useChangePassword: () => ({ mutateAsync: h.changePassword, isPending: false }),
}))
vi.mock('@/shared/ui/Toast', () => ({ useToast: () => ({ show: h.show }) }))

describe('ProfileFormModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prefills name and phone, email is read-only', () => {
    render(<ProfileFormModal onClose={() => {}} />)
    expect(screen.getByLabelText('Full name')).toHaveValue('Kaja')
    expect(screen.getByLabelText('Phone')).toHaveValue('123')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
  })

  it('Save sends the edited name and phone', async () => {
    render(<ProfileFormModal onClose={() => {}} />)
    const name = screen.getByLabelText('Full name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Kaja A')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(h.updateProfile).toHaveBeenCalledWith({ fullName: 'Kaja A', phone: '123' })
  })

  it('password update is blocked until 8+ chars and matching', async () => {
    render(<ProfileFormModal onClose={() => {}} />)
    const btn = screen.getByRole('button', { name: 'Update password' })
    expect(btn).toBeDisabled()

    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short')
    expect(btn).toBeDisabled()
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('New password'))
    await userEvent.type(screen.getByLabelText('New password'), 'longenough1')
    expect(btn).toBeDisabled() // confirm still "short"
    expect(screen.getByText('Does not match')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Confirm password'))
    await userEvent.type(screen.getByLabelText('Confirm password'), 'longenough1')
    expect(btn).toBeEnabled()

    await userEvent.click(btn)
    expect(h.changePassword).toHaveBeenCalledWith('longenough1')
  })
})
