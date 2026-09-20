import { render, screen } from '@testing-library/react'
import {
  MobileChromeProvider,
  useMobileBackHandler,
  useMobileBackScreen,
} from '@/components/navigation/MobileChromeContext'

function Reporter() {
  const onBack = useMobileBackHandler()
  return <div data-testid="state">{onBack ? 'has-back' : 'no-back'}</div>
}

function Screen({ active, onBack, label }: { active: boolean; onBack: () => void; label: string }) {
  useMobileBackScreen(active, onBack)
  return active ? <div>{label}</div> : null
}

describe('MobileChromeContext', () => {
  it('reports no back handler when nothing is registered', () => {
    render(
      <MobileChromeProvider>
        <Reporter />
      </MobileChromeProvider>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('no-back')
  })

  it('activates the handler for a mounted active screen', () => {
    const onBack = vi.fn()
    render(
      <MobileChromeProvider>
        <Reporter />
        <Screen active onBack={onBack} label="outer" />
      </MobileChromeProvider>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('has-back')
  })

  it('stacks nested screens and restores the outer one when the inner closes', () => {
    const outerBack = vi.fn()
    const innerBack = vi.fn()
    const { rerender } = render(
      <MobileChromeProvider>
        <Reporter />
        <Screen active onBack={outerBack} label="outer" />
      </MobileChromeProvider>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('has-back')

    rerender(
      <MobileChromeProvider>
        <Reporter />
        <Screen active onBack={outerBack} label="outer" />
        <Screen active onBack={innerBack} label="inner" />
      </MobileChromeProvider>,
    )
    expect(screen.getByText('inner')).toBeInTheDocument()

    rerender(
      <MobileChromeProvider>
        <Reporter />
        <Screen active onBack={outerBack} label="outer" />
      </MobileChromeProvider>,
    )
    expect(screen.queryByText('inner')).not.toBeInTheDocument()
    expect(screen.getByTestId('state')).toHaveTextContent('has-back')
  })

  it('clears the handler once the only active screen deactivates', () => {
    const onBack = vi.fn()
    const { rerender } = render(
      <MobileChromeProvider>
        <Reporter />
        <Screen active onBack={onBack} label="outer" />
      </MobileChromeProvider>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('has-back')

    rerender(
      <MobileChromeProvider>
        <Reporter />
        <Screen active={false} onBack={onBack} label="outer" />
      </MobileChromeProvider>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('no-back')
  })
})
