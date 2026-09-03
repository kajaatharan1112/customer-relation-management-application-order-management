import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PurgeConfirmModal } from '@/features/maintenance/components/PurgeConfirmModal'

const counts = { bills: 12, billRows: 30, comments: 5, attachments: 8, storageBytes: 40960 }

it('Confirm is disabled until the word PURGE is typed exactly', async () => {
  const onConfirm = vi.fn()
  render(<PurgeConfirmModal counts={counts} onCancel={() => {}} onConfirm={onConfirm} />)
  const confirm = screen.getByRole('button', { name: /^permanently delete$/i })
  expect(confirm).toBeDisabled()
  const input = screen.getByLabelText(/type purge/i)
  await userEvent.type(input, 'PURG')
  expect(confirm).toBeDisabled()
  await userEvent.type(input, 'E')
  expect(confirm).toBeEnabled()
  await userEvent.click(confirm)
  expect(onConfirm).toHaveBeenCalled()
})

it('shows what will be removed', () => {
  render(<PurgeConfirmModal counts={counts} onCancel={() => {}} onConfirm={() => {}} />)
  expect(screen.getByText('12')).toBeInTheDocument() // bills
  expect(screen.getByText('8')).toBeInTheDocument() // attachments
})
