import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductsBlock } from '@/features/home/components/blocks/ProductsBlock'
import type { ProductVM } from '@/features/home/home.types'

const p = (o: Partial<ProductVM>): ProductVM => ({
  id: 'x', category: 'Print', name: 'Card', description: null, price: 1500,
  imagePath: null, isActive: true, sortOrder: 0, ...o,
})

const actions = {
  upsert: vi.fn().mockResolvedValue('new'),
  remove: vi.fn().mockResolvedValue(undefined),
  swapOrder: vi.fn().mockResolvedValue(undefined),
  uploadImage: vi.fn().mockResolvedValue('product/x.png'),
}

beforeEach(() => vi.clearAllMocks())

it('renders products grouped by category with formatted prices', () => {
  render(
    <ProductsBlock
      products={[p({ id: '1', category: 'Print', name: 'Card' }), p({ id: '2', category: 'Signage', name: 'Banner', price: 8000 })]}
      editable={false}
      actions={actions}
    />,
  )
  expect(screen.getByText('Print')).toBeInTheDocument()
  expect(screen.getByText('Signage')).toBeInTheDocument()
  expect(screen.getByText('Card')).toBeInTheDocument()
  expect(screen.getByText(/1,500/)).toBeInTheDocument()
})

it('non-admin hides inactive products; admin shows them with controls', () => {
  const list = [p({ id: '1', name: 'Live' }), p({ id: '2', name: 'Hidden', isActive: false })]
  const { rerender } = render(<ProductsBlock products={list} editable={false} actions={actions} />)
  expect(screen.queryByText('Hidden')).toBeNull()
  rerender(<ProductsBlock products={list} editable actions={actions} />)
  expect(screen.getByText('Hidden')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThan(0)
})

it('admin can add a product', async () => {
  render(<ProductsBlock products={[]} editable actions={actions} />)
  await userEvent.click(screen.getByRole('button', { name: /add product/i }))
  await userEvent.type(screen.getByLabelText(/name/i), 'New thing')
  await userEvent.type(screen.getByLabelText(/^price/i), '250')
  await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
  expect(actions.upsert).toHaveBeenCalledWith(expect.objectContaining({ name: 'New thing', price: 250 }))
})
