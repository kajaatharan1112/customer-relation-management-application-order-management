import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompanyBlock } from '@/features/home/components/blocks/CompanyBlock'
import type { CompanyVM } from '@/features/home/home.types'

const company: CompanyVM = {
  name: 'Acme Print', tagline: 'We print things', about: 'Since 2010', address: '1 Main St',
  phone: '011-222', email: 'hi@acme.lk', hours: 'Mon–Fri 9–5', logoPath: null, socials: {},
}

it('read view shows the company details and no edit control when not editable', () => {
  render(<CompanyBlock company={company} editable={false} onSave={async () => {}} onUploadLogo={async () => ''} />)
  expect(screen.getByText('Acme Print')).toBeInTheDocument()
  expect(screen.getByText('We print things')).toBeInTheDocument()
  expect(screen.getByText('011-222')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /edit/i })).toBeNull()
})

it('admin can edit and save the tagline', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<CompanyBlock company={company} editable onSave={onSave} onUploadLogo={async () => ''} />)
  await userEvent.click(screen.getByRole('button', { name: /edit/i }))
  const tagline = screen.getByLabelText(/tagline/i)
  await userEvent.clear(tagline)
  await userEvent.type(tagline, 'Fast prints')
  await userEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tagline: 'Fast prints' }))
})
