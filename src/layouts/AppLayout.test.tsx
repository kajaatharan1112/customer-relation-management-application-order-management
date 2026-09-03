import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'

vi.mock('@/components/navigation/Sidebar', () => ({ Sidebar: () => null }))
vi.mock('@/components/navigation/MobileBottomBar', () => ({ MobileBottomBar: () => null }))
vi.mock('@/components/navigation/TopBar', () => ({ TopBar: ({ title }: { title: string }) => <div>{title}</div> }))

function PageA() {
  const navigate = useNavigate()
  return (
    <div>
      <span>PAGE A</span>
      <button type="button" onClick={() => navigate('/b')}>
        go B
      </button>
    </div>
  )
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/a']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/a" element={<PageA />} />
          <Route path="/b" element={<span>PAGE B</span>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout route transition', () => {
  it('swaps routed content on navigation and never stacks two pages', async () => {
    renderApp()
    expect(screen.getByText('PAGE A')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'go B' }))

    expect(screen.getByText('PAGE B')).toBeInTheDocument()
    expect(screen.queryByText('PAGE A')).toBeNull()
    // the keyed wrapper is the sole child of <main> — no leftover exiting node
    expect(document.querySelector('main')?.children).toHaveLength(1)
  })
})
