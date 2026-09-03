import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromotionsBlock } from '@/features/home/components/blocks/PromotionsBlock'
import type { PromotionVM } from '@/features/home/home.types'

const base: PromotionVM = {
  id: 'x', title: 'Deal', body: 'Big savings', imagePath: null,
  discountKind: 'percent', discountValue: '20', startsAt: null, endsAt: null,
  isActive: true, sortOrder: 0,
}
const promo = (o: Partial<PromotionVM>): PromotionVM => ({ ...base, ...o })

const actions = {
  upsert: vi.fn().mockResolvedValue('new'),
  remove: vi.fn().mockResolvedValue(undefined),
  swapOrder: vi.fn().mockResolvedValue(undefined),
  uploadImage: vi.fn().mockResolvedValue('promo/x.png'),
}
beforeEach(() => vi.clearAllMocks())

const YEAR = 365 * 24 * 60 * 60 * 1000

it('shows a live promotion with its discount pill to a non-admin', () => {
  render(<PromotionsBlock promotions={[promo({ id: '1' })]} editable={false} isAdmin={false} actions={actions} />)
  expect(screen.getByText('Deal')).toBeInTheDocument()
  expect(screen.getByText(/20% off/i)).toBeInTheDocument()
})

it('hides expired / inactive promotions from a non-admin but shows them badged to an admin', () => {
  const list = [
    promo({ id: '1', title: 'Expired', endsAt: new Date(Date.now() - YEAR).toISOString() }),
    promo({ id: '2', title: 'Off', isActive: false }),
    promo({ id: '3', title: 'Live' }),
  ]
  const { rerender } = render(
    <PromotionsBlock promotions={list} editable={false} isAdmin={false} actions={actions} />,
  )
  expect(screen.queryByText('Expired')).toBeNull()
  expect(screen.queryByText('Off')).toBeNull()
  expect(screen.getByText('Live')).toBeInTheDocument()

  rerender(<PromotionsBlock promotions={list} editable isAdmin actions={actions} />)
  // title + status badge both read "Expired"
  expect(screen.getAllByText(/expired/i).length).toBeGreaterThanOrEqual(2)
})

it('admin can add an advertisement', async () => {
  render(<PromotionsBlock promotions={[]} editable isAdmin actions={actions} />)
  await userEvent.click(screen.getByRole('button', { name: /add advertisement/i }))
  await userEvent.type(screen.getByLabelText(/title/i), 'Flash sale')
  await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
  expect(actions.upsert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Flash sale' }))
})
