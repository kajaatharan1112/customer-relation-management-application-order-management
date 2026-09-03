import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { HomePageVM } from '@/features/home/home.types'

const state = vi.hoisted(() => ({
  isAdmin: false,
  query: { data: undefined as HomePageVM | undefined, isLoading: false, isError: false },
}))

const setBlockVisible = vi.hoisted(() => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined) }))
const swapBlockOrder = vi.hoisted(() => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined) }))
const noop = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined) })

vi.mock('@/features/home/queries/useHomePage', () => ({ useHomePage: () => state.query }))
vi.mock('@/core/auth/auth.hooks', () => ({ useRole: () => ({ isAdmin: state.isAdmin }) }))
vi.mock('@/features/home/mutations/useHomeMutations', () => ({
  useHomeMutations: () => ({
    setBlockVisible,
    swapBlockOrder,
    saveCompany: noop(),
    upsertProduct: noop(),
    deleteProduct: noop(),
    upsertPromotion: noop(),
    deletePromotion: noop(),
    addGalleryImage: noop(),
    updateGalleryCaption: noop(),
    deleteGalleryImage: noop(),
    swapListOrder: noop(),
    uploadImage: noop(),
  }),
}))

import HomePage from '@/features/home/HomePage'

const vm: HomePageVM = {
  blocks: [
    { type: 'company', sortOrder: 0, isVisible: true },
    { type: 'products', sortOrder: 1, isVisible: true },
    { type: 'promotions', sortOrder: 2, isVisible: false },
    { type: 'album', sortOrder: 3, isVisible: false },
  ],
  company: {
    name: 'Acme', tagline: 'T', about: '', address: '', phone: '', email: '', hours: '',
    logoPath: null, socials: {},
  },
  products: [
    { id: 'p1', category: 'Print', name: 'Card', description: null, price: 100, imagePath: null, isActive: true, sortOrder: 0 },
  ],
  promotions: [],
  gallery: [],
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  state.isAdmin = false
  state.query = { data: vm, isLoading: false, isError: false }
})

it('shows loading and error states', () => {
  state.query = { data: undefined, isLoading: true, isError: false }
  const { rerender } = renderPage()
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  state.query = { data: undefined, isLoading: false, isError: true }
  rerender(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
  expect(screen.getByText(/could not load/i)).toBeInTheDocument()
})

it('renders the visible blocks for a viewer, with no editing chrome', () => {
  renderPage()
  expect(screen.getByRole('heading', { name: 'Acme' })).toBeInTheDocument()
  expect(screen.getByText('Products & pricing')).toBeInTheDocument()
  expect(screen.queryByText(/page layout/i)).toBeNull()
  expect(screen.queryByRole('button', { name: /add product/i })).toBeNull()
  expect(screen.queryByRole('button', { name: /^edit$/i })).toBeNull()
})

it('gives an admin the Page layout bar and toggles block visibility', async () => {
  state.isAdmin = true
  renderPage()
  expect(screen.getByText(/page layout/i)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /hide products/i }))
  expect(setBlockVisible.mutate).toHaveBeenCalledWith({ type: 'products', isVisible: false })
})
