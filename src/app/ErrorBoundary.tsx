import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time throws anywhere below it so a bad data shape or a
 * component bug shows a recoverable card instead of unmounting the whole app
 * to a blank white page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-neo-bg)] p-6">
        <div className="w-full max-w-sm rounded-[var(--radius-neo-large)] border border-white/60 bg-[var(--color-neo-card)] p-6 text-center shadow-[var(--shadow-neo-floating)]">
          <h1 className="text-lg font-bold text-[var(--color-neo-text-primary)]">Something went wrong</h1>
          <p className="mt-2 text-sm text-[var(--color-neo-text-secondary)]">
            This screen hit an unexpected error. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-10 w-full rounded-[var(--radius-neo-md)] bg-[var(--color-neo-primary)] text-sm font-semibold text-white shadow-[var(--shadow-neo-soft)] transition active:scale-95"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
