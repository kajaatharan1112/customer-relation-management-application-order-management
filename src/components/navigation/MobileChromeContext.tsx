import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface StackEntry {
  token: symbol
  onBack: () => void
}

interface PushPopApi {
  push: (onBack: () => void) => symbol
  pop: (token: symbol) => void
}

const PushPopContext = createContext<PushPopApi | null>(null)
const TopBackContext = createContext<(() => void) | null>(null)

/**
 * Wraps the app shell. Mobile sub-screens (a customer's bill list, a bill's
 * detail page, a profile page) register a back-handler while they're the
 * active layer; the shell shows that instead of the main bottom nav. Nested
 * screens stack — the most recently mounted one wins, and unmounting restores
 * whichever was active before it.
 */
export function MobileChromeProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([])

  const push = useCallback((onBack: () => void) => {
    const token = Symbol('mobile-back-screen')
    setStack((s) => [...s, { token, onBack }])
    return token
  }, [])

  const pop = useCallback((token: symbol) => {
    setStack((s) => s.filter((e) => e.token !== token))
  }, [])

  const api = useMemo(() => ({ push, pop }), [push, pop])
  const top = stack.length > 0 ? stack[stack.length - 1].onBack : null

  return (
    <PushPopContext.Provider value={api}>
      <TopBackContext.Provider value={top}>{children}</TopBackContext.Provider>
    </PushPopContext.Provider>
  )
}

/** The active mobile sub-screen's back handler, or null when none is active. */
export function useMobileBackHandler(): (() => void) | null {
  return useContext(TopBackContext)
}

/**
 * Registers `onBack` as the mobile back-bar handler while `active` is true,
 * and un-registers it on cleanup (screen closed or unmounted).
 */
export function useMobileBackScreen(active: boolean, onBack: () => void) {
  const api = useContext(PushPopContext)
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    if (!active || !api) return
    const token = api.push(() => onBackRef.current())
    return () => api.pop(token)
  }, [active, api])
}
