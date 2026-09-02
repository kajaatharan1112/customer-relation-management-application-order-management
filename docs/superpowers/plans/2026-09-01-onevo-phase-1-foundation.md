# ONEVO Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the ONEVO project skeleton — a deployable React+TS+Vite app wired to a Supabase backend whose full database schema, RLS, auth (email/password + Google), roles, app shell, and keep-alive are in place, with placeholder pages for every later feature.

**Architecture:** One repo, one Supabase project, one Vercel deployment. Feature-folder frontend (`app` / `core` / `shared` / `layouts` / `features`); data access isolated behind a Supabase client module. The **entire 5-phase database schema** is created in this phase (migrations + RLS + seed) so later phases only add UI. Auth state flows through an `AuthProvider`; route guards gate staff vs customer areas. Design system is ported from the `New folder/` prototype (neumorphic tokens + core UI components), converted to TypeScript.

**Tech Stack:** React 19, TypeScript, Vite, React Router v6, TanStack Query v5, Zustand, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion, lucide-react, `@supabase/supabase-js` v2, Supabase CLI (Docker-backed local stack), Vitest + React Testing Library, Zod.

**Spec:** `docs/superpowers/specs/2026-09-01-onevo-foundation-design.md` — read it alongside this plan.

## Global Constraints

- **Single-tenant.** No `tenant_id` / `organization_id` columns for isolation.
- **Language:** TypeScript strict mode on. No `any`. Use generated Supabase types.
- **Everything soft-deletes** via `deleted_at timestamptz`; append-only tables (`order_status_history`, `audit_logs`) have no `deleted_at`.
- **Every read policy / query filters `deleted_at is null`** (except append-only tables).
- **User types are data** (`user_types` table): `admin_member`, `employee`, `customer`. Phase 1 ships features for `admin_member` + `customer` only; `employee` policies are written but unexercised.
- **Bill statuses are fixed:** `pending`, `active`, `completed`, `paid`. Seeded; no write API; not editable by anyone.
- **Currency:** single app-wide, from `organization_settings` (`LKR` / `en-LK` defaults).
- **Design tokens:** neumorphic — bg `#E9EEF5`, primary `#5A7BFF`, radius 15px, Inter font, soft/pressed/floating shadows. Copy exact values from `New folder/src/index.css`.
- **Do NOT run git.** The user manages git (init, add, commit, branch) themselves. Where a step below says "Commit", stage nothing and instead pause for the user to commit; the executor reports "ready to commit: <suggested message>".
- **IDs:** `uuid primary key default gen_random_uuid()`. Timestamps: `created_at` / `updated_at timestamptz not null default now()`.
- **Path alias:** `@/` → `src/`.
- **Package manager:** npm.
- **Node:** 20 LTS or newer.

---

## File Structure

```
onevo/  (repo root = C:\Users\User\Desktop\perss desin)
├── index.html
├── package.json                       scripts: dev, build, preview, lint, test, typecheck
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts                     react plugin, @tailwindcss/vite, @/ alias, vitest config
├── vitest.setup.ts                    jest-dom, cleanup
├── vercel.json                        SPA rewrite
├── .env.example                       VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .gitignore                         New folder/, node_modules, dist, .env.local, .env
├── README.md                          setup, env, Supabase restore fallback, keep-alive
├── .github/workflows/keepalive.yml    cron every 3 days -> REST read
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_core_schema.sql       all tables (spec §7.1–7.6)
│   │   ├── 0002_functions_triggers.sql  helpers, triggers, RPCs (spec §7.7)
│   │   ├── 0003_rls_policies.sql      RLS enable + policies (spec §8) + storage policy
│   │   └── 0004_seed.sql              user_types, bill_statuses, organization_settings
│   ├── tests/
│   │   ├── triggers.test.sql          pgTAP-free assertions run via `supabase db execute`
│   │   └── rls.test.sql              JWT-claim based visibility checks
│   └── functions/
│       └── admin-create-user/
│           ├── index.ts
│           └── deno.json
└── src/
    ├── main.tsx
    ├── index.css                      @import "tailwindcss"; @theme neo tokens
    ├── app/
    │   ├── App.tsx
    │   ├── router/
    │   │   ├── AppRouter.tsx
    │   │   ├── ProtectedRoute.tsx
    │   │   └── RoleRoute.tsx
    │   └── providers/
    │       ├── QueryProvider.tsx
    │       └── AuthProvider.tsx
    ├── core/
    │   ├── config/env.ts
    │   ├── supabase/
    │   │   ├── client.ts
    │   │   └── database.types.ts       generated
    │   ├── auth/
    │   │   ├── auth.service.ts
    │   │   ├── auth.hooks.ts
    │   │   └── auth.types.ts
    │   └── permissions/permissions.ts
    ├── shared/
    │   ├── ui/
    │   │   ├── Card.tsx
    │   │   ├── Button.tsx
    │   │   ├── StatusBadge.tsx
    │   │   ├── Modal.tsx
    │   │   └── Toast.tsx
    │   ├── utils/cn.ts
    │   └── constants/routes.ts
    ├── layouts/
    │   ├── AuthLayout.tsx
    │   ├── AppLayout.tsx
    │   └── PortalLayout.tsx
    ├── components/navigation/
    │   ├── Sidebar.tsx
    │   ├── TopBar.tsx
    │   └── MobileBottomBar.tsx
    └── features/
        ├── auth/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── ForgotPasswordPage.tsx
        │   ├── ResetPasswordPage.tsx
        │   └── OAuthCallbackPage.tsx
        ├── dashboard/DashboardPage.tsx        (placeholder)
        ├── customers/CustomersPage.tsx         (placeholder)
        ├── bills/BillsPage.tsx                 (placeholder)
        ├── settings/SettingsPage.tsx           (placeholder)
        └── portal/
            ├── PortalHomePage.tsx              (placeholder)
            └── PortalBillPage.tsx              (placeholder)
```

---

## Task 1: Scaffold project, tooling, and test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `vitest.setup.ts`, `.gitignore`, `.env.example`, `src/shared/utils/cn.ts`
- Test: `src/shared/utils/cn.test.ts`

**Interfaces:**
- Produces: `cn(...classes: ClassValue[]) => string` from `src/shared/utils/cn.ts`; npm scripts `dev`, `build`, `preview`, `lint`, `test`, `typecheck`; `@/` alias resolving to `src/`.

- [ ] **Step 1: Scaffold with Vite**

Run in the repo root:
```bash
npm create vite@latest . -- --template react-ts
```
If the directory is non-empty, choose "Ignore files and continue". Then:
```bash
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
npm install clsx tailwind-merge
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
node_modules
dist
dist-ssr
*.local
.env
.env.local
.env.*.local
New folder/
supabase/.branches
supabase/.temp
.vercel
coverage
```

- [ ] **Step 3: Write `.env.example`**

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 4: Configure `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
  },
})
```

- [ ] **Step 5: `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())
```

- [ ] **Step 6: Set `tsconfig.app.json` paths + strict**

Ensure `compilerOptions` contains:
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "baseUrl": ".",
  "paths": { "@/*": ["src/*"] }
}
```

- [ ] **Step 7: Add npm scripts**

In `package.json` `"scripts"`:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "typecheck": "tsc -b --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 8: Write the failing test for `cn`**

`src/shared/utils/cn.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { cn } from '@/shared/utils/cn'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', false, 'b', undefined, 'c')).toBe('a b c')
  })
  it('dedupes conflicting tailwind classes, last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
```

- [ ] **Step 9: Run it, expect failure**

Run: `npm test -- cn`
Expected: FAIL — cannot find module `@/shared/utils/cn`.

- [ ] **Step 10: Implement `src/shared/utils/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 11: Replace `src/app/App.tsx` with a minimal shell**

```tsx
export default function App() {
  return <div className="min-h-dvh">ONEVO</div>
}
```
Update `src/main.tsx` to import `./index.css` and `App` from `@/app/App`. Delete the Vite starter `src/App.css`, demo assets, and `src/App.tsx` if it exists at the old path.

- [ ] **Step 12: Verify**

Run: `npm test` — Expected: cn tests PASS.
Run: `npm run typecheck` — Expected: no errors.
Run: `npm run build` — Expected: build succeeds.

- [ ] **Step 13: Commit**

Report ready to commit: `chore: scaffold vite react-ts project with vitest and tooling`

---

## Task 2: Tailwind v4 + neumorphic design tokens

**Files:**
- Create: `src/index.css`
- Modify: `vite.config.ts` (add tailwind plugin)
- Test: `src/index.css.test.tsx`

**Interfaces:**
- Produces: global CSS with `@theme` custom properties `--color-neo-*`, `--shadow-neo-*`, `--radius-neo-*`, `--font-sans`, plus `bg-[var(--color-neo-bg)]` usable in components.

- [ ] **Step 1: Install Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add plugin to `vite.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite'
// plugins: [react(), tailwindcss()]
```

- [ ] **Step 3: Write `src/index.css`**

Copy the token values verbatim from `New folder/src/index.css`:
```css
@import "tailwindcss";

@theme {
  --color-neo-bg: #E9EEF5;
  --color-neo-surface: #EEF3F8;
  --color-neo-card: #EDF2F8;
  --color-neo-primary: #5A7BFF;
  --color-neo-secondary: #7E8DA8;
  --color-neo-success: #39C16C;
  --color-neo-warning: #F4B740;
  --color-neo-danger: #F45B69;
  --color-neo-text-primary: #2B2D42;
  --color-neo-text-secondary: #68768A;

  --shadow-neo-soft: -8px -8px 16px rgba(255,255,255,0.9), 8px 8px 18px rgba(163,177,198,0.55);
  --shadow-neo-pressed: inset -4px -4px 8px rgba(255,255,255,0.9), inset 4px 4px 10px rgba(163,177,198,0.5);
  --shadow-neo-floating: -16px -16px 30px rgba(255,255,255,0.8), 16px 16px 32px rgba(163,177,198,0.4);

  --radius-neo-sm: 10px;
  --radius-neo-md: 15px;
  --radius-neo-lg: 15px;
  --radius-neo-large: 15px;
  --radius-neo-pill: 999px;

  --font-sans: 'Inter', system-ui, sans-serif;
}

@layer base {
  html {
    font-family: var(--font-sans);
    background-color: var(--color-neo-bg);
    color: var(--color-neo-text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  body { margin: 0; min-height: 100dvh; background-color: var(--color-neo-bg); }
  * { scrollbar-width: none; -ms-overflow-style: none; }
  *::-webkit-scrollbar { display: none; }
}
```

- [ ] **Step 4: Add the Inter font to `index.html`**

In `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```
Set `<title>ONEVO</title>` and the description meta from the prototype.

- [ ] **Step 5: Write the test**

`src/index.css.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

describe('neo tokens', () => {
  it('renders an element with the neo background utility', () => {
    const { container } = render(<div className="bg-[var(--color-neo-bg)]">x</div>)
    expect(container.firstChild).toHaveClass('bg-[var(--color-neo-bg)]')
  })
})
```
(Token computation is not available in jsdom; this is a smoke check that the class survives. Visual verification is manual in Step 6.)

- [ ] **Step 6: Manual visual check**

Run: `npm run dev`. Open the app. Confirm the page background is the pale blue-grey `#E9EEF5` and the font is Inter.

- [ ] **Step 7: Verify + commit**

Run: `npm test`, `npm run build` — Expected: PASS.
Report ready to commit: `feat: add tailwind v4 and neumorphic design tokens`

---

## Task 3: Core UI components — Card, Button, StatusBadge

**Files:**
- Create: `src/shared/ui/Card.tsx`, `src/shared/ui/Button.tsx`, `src/shared/ui/StatusBadge.tsx`
- Test: `src/shared/ui/Card.test.tsx`, `src/shared/ui/Button.test.tsx`, `src/shared/ui/StatusBadge.test.tsx`

**Interfaces:**
- Produces:
  - `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) — `props: React.HTMLAttributes<HTMLDivElement> & { variant?: 'soft' | 'inset' | 'floating' }`
  - `Button` — `props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'primary'|'danger'|'ghost'|'inset'; size?: 'default'|'sm'|'lg'|'icon'; fullWidth?: boolean; icon?: React.ReactNode }`
  - `StatusBadge` — `props: { label: string; color?: string }` (color defaults to `var(--color-neo-primary)`)

- [ ] **Step 1: Install component deps**

```bash
npm install class-variance-authority @radix-ui/react-slot framer-motion lucide-react
```

- [ ] **Step 2: Write failing tests**

`src/shared/ui/Card.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardTitle } from '@/shared/ui/Card'

describe('Card', () => {
  it('renders children and default soft variant classes', () => {
    render(<Card data-testid="c">hello</Card>)
    const el = screen.getByTestId('c')
    expect(el).toHaveTextContent('hello')
    expect(el.className).toContain('shadow-[var(--shadow-neo-soft)]')
  })
  it('applies inset variant', () => {
    render(<Card data-testid="c" variant="inset">x</Card>)
    expect(screen.getByTestId('c').className).toContain('shadow-[var(--shadow-neo-pressed)]')
  })
  it('CardTitle renders an h3', () => {
    render(<CardTitle>T</CardTitle>)
    expect(screen.getByRole('heading', { level: 3, name: 'T' })).toBeInTheDocument()
  })
})
```

`src/shared/ui/Button.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/shared/ui/Button'

describe('Button', () => {
  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('is disabled when disabled prop set', () => {
    render(<Button disabled>Go</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('renders primary variant classes', () => {
    render(<Button variant="primary">Go</Button>)
    expect(screen.getByRole('button').className).toContain('bg-[var(--color-neo-primary)]')
  })
})
```

`src/shared/ui/StatusBadge.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/shared/ui/StatusBadge'

describe('StatusBadge', () => {
  it('renders the label', () => {
    render(<StatusBadge label="Pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests, expect failure**

Run: `npm test -- shared/ui`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `Card.tsx`**

Port `New folder/src/components/ui/Card.jsx` to TS: same class strings, replace `cn` import with `@/shared/utils/cn`, type each subcomponent as `React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'soft' | 'inset' | 'floating' }>` (only `Card` takes `variant`; the rest take plain `HTMLAttributes`). Keep `variantStyles` exactly as in the source.

- [ ] **Step 5: Implement `Button.tsx`**

Port `New folder/src/components/buttons/PrimaryButton.jsx` to TS, renamed `Button`. Keep the full `cva` config verbatim. Type the props as in the Interfaces block above. Keep the Framer Motion `whileHover` / `whileTap` behavior (no scale for `ghost`/`inset`). Export `Button` and `buttonVariants`.

- [ ] **Step 6: Implement `StatusBadge.tsx`**

Self-contained (no CSS file, no external status constants):
```tsx
export interface StatusBadgeProps {
  label: string
  color?: string
}

export function StatusBadge({ label, color = 'var(--color-neo-primary)' }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-neo-pill)] px-2.5 py-1 text-xs font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
```

- [ ] **Step 7: Run tests, expect pass**

Run: `npm test -- shared/ui` — Expected: PASS.
Run: `npm run typecheck` — Expected: no errors.

- [ ] **Step 8: Commit**

Report ready to commit: `feat: add Card, Button, StatusBadge UI components`

---

## Task 4: Feedback components — Modal, Toast

**Files:**
- Create: `src/shared/ui/Modal.tsx`, `src/shared/ui/Toast.tsx`
- Test: `src/shared/ui/Modal.test.tsx`, `src/shared/ui/Toast.test.tsx`

**Interfaces:**
- Produces:
  - `Modal` — `props: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }`. Renders nothing when `open` is false. Calls `onClose` on backdrop click and Escape.
  - `ToastProvider` — wraps the app; `useToast() => { show: (t: { type: 'success'|'error'|'info'; title: string; message?: string }) => void }`. Toasts auto-dismiss after 4000ms.

- [ ] **Step 1: Write failing tests**

`src/shared/ui/Modal.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/shared/ui/Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}}>body</Modal>)
    expect(screen.queryByText('body')).not.toBeInTheDocument()
  })
  it('renders content when open and closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Hi">body</Modal>)
    expect(screen.getByText('body')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

`src/shared/ui/Toast.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '@/shared/ui/Toast'

function Trigger() {
  const { show } = useToast()
  return <button onClick={() => show({ type: 'success', title: 'Saved' })}>go</button>
}

describe('Toast', () => {
  it('shows a toast on demand', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'go' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- shared/ui/Modal shared/ui/Toast` — Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `Modal.tsx`**

```tsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/shared/utils/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className={cn('w-full max-w-lg rounded-[var(--radius-neo-large)] bg-[var(--color-neo-card)] p-6 shadow-[var(--shadow-neo-floating)]', className)}
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <h2 className="mb-4 text-lg font-bold text-[var(--color-neo-text-primary)]">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
```

- [ ] **Step 4: Implement `Toast.tsx`**

```tsx
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

type ToastKind = 'success' | 'error' | 'info'
interface ToastInput { type: ToastKind; title: string; message?: string }
interface ToastItem extends ToastInput { id: number }

const ToastCtx = createContext<{ show: (t: ToastInput) => void } | null>(null)

const barColor: Record<ToastKind, string> = {
  success: 'var(--color-neo-success)',
  error: 'var(--color-neo-danger)',
  info: 'var(--color-neo-primary)',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const show = useCallback((t: ToastInput) => {
    const id = ++seq.current
    setItems((prev) => [...prev, { ...t, id }])
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="fixed right-4 top-4 z-[60] flex flex-col gap-2">
          <AnimatePresence>
            {items.map((t) => (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                className="min-w-64 rounded-[var(--radius-neo-md)] border-l-4 bg-[var(--color-neo-card)] p-3 shadow-[var(--shadow-neo-floating)]"
                style={{ borderLeftColor: barColor[t.type] }}
              >
                <p className="text-sm font-semibold text-[var(--color-neo-text-primary)]">{t.title}</p>
                {t.message && <p className="text-xs text-[var(--color-neo-text-secondary)]">{t.message}</p>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- shared/ui/Modal shared/ui/Toast` — Expected: PASS.
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 6: Commit**

Report ready to commit: `feat: add Modal and Toast feedback components`

---

## Task 5: Supabase project init + client + env config

**Files:**
- Create: `supabase/config.toml` (via CLI), `src/core/config/env.ts`, `src/core/supabase/client.ts`, `.env.local` (local only, not committed)
- Test: `src/core/config/env.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `env` object from `@/core/config/env` — `{ supabaseUrl: string; supabaseAnonKey: string }`, throws at import time if missing.
  - `supabase` client singleton from `@/core/supabase/client` — typed `SupabaseClient<Database>` once Task 10 generates `Database`; until then typed `SupabaseClient`.

- [ ] **Step 1: Install deps + init Supabase**

```bash
npm install @supabase/supabase-js zod
supabase init
supabase start
```
`supabase start` requires Docker Desktop running. It prints `API URL`, `anon key`, `service_role key`, `DB URL`. Keep this output.

- [ ] **Step 2: Create `.env.local`**

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
```

- [ ] **Step 3: Write failing test for `env.ts`**

`src/core/config/env.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('env', () => {
  it('parses required VITE_SUPABASE_* vars', async () => {
    const { env } = await import('@/core/config/env')
    expect(env.supabaseUrl).toMatch(/^https?:\/\//)
    expect(env.supabaseAnonKey.length).toBeGreaterThan(10)
  })
})
```
Add to `vitest.setup.ts` (top of file) test env defaults so the import never throws in CI:
```ts
process.env.VITE_SUPABASE_URL ||= 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_ANON_KEY ||= 'test-anon-key-value-1234567890'
```
Note: Vite exposes vars via `import.meta.env`. In Vitest, `import.meta.env` is populated from `process.env` for `VITE_`-prefixed keys, so the defaults above suffice.

- [ ] **Step 4: Run, expect failure**

Run: `npm test -- config/env` — Expected: FAIL, module not found.

- [ ] **Step 5: Implement `src/core/config/env.ts`**

```ts
import { z } from 'zod'

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10),
})

const parsed = schema.safeParse(import.meta.env)
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`)
}

export const env = {
  supabaseUrl: parsed.data.VITE_SUPABASE_URL,
  supabaseAnonKey: parsed.data.VITE_SUPABASE_ANON_KEY,
}
```

- [ ] **Step 6: Implement `src/core/supabase/client.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import { env } from '@/core/config/env'

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
```

- [ ] **Step 7: Verify**

Run: `npm test -- config/env` — Expected: PASS.
Run: `npm run typecheck`, `npm run build` — Expected: clean.

- [ ] **Step 8: Commit**

Report ready to commit: `feat: init supabase, add env validation and client singleton`

---

## Task 6: Migration 0001 — core schema (all tables)

**Files:**
- Create: `supabase/migrations/0001_core_schema.sql`
- Test: `supabase/tests/schema.test.sql`

**Interfaces:**
- Produces: every table from spec §7.1–7.6 with the exact columns, types, and FKs listed there. Later tasks reference table/column names from the spec.

- [ ] **Step 1: Write `0001_core_schema.sql`**

Implement spec §7.1–7.6 exactly. Structure:
```sql
-- extensions
create extension if not exists "pgcrypto";

-- 7.1 lookup / config
create table public.user_types (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  sort_order int not null
);

create table public.bill_statuses (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  sort_order int not null,
  is_terminal boolean not null default false
);

create table public.organization_settings (
  id boolean primary key default true,
  org_name text not null default 'ONEVO',
  currency_code text not null default 'LKR',
  currency_locale text not null default 'en-LK',
  default_bill_status_id uuid not null references public.bill_statuses(id),
  logo_path text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint organization_settings_singleton check (id = true)
);

-- 7.2 users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type_id uuid not null references public.user_types(id),
  full_name text not null default '',
  email text not null,
  phone text,
  status text not null default 'active' check (status in ('active','invited','disabled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.customers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text,
  address_line text,
  city text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 7.3 workflow & order types
create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates(id) on delete cascade,
  name text not null,
  sort_order int not null,
  color text not null default '#5A7BFF',
  is_final boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workflow_stages_order_uniq unique (template_id, sort_order) deferrable initially deferred
);

create table public.order_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  workflow_template_id uuid not null references public.workflow_templates(id),
  fixed_amount numeric(12,2),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 7.4 bills
create sequence if not exists public.bill_number_seq;

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text unique not null,
  customer_id uuid not null references public.profiles(id),
  bill_status_id uuid not null references public.bill_statuses(id),
  order_date date not null default current_date,
  deadline date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.bill_rows (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  sort_order int not null default 0,
  detail text not null default '',
  order_type_id uuid references public.order_types(id),
  amount numeric(12,2) not null default 0,
  current_stage_id uuid references public.workflow_stages(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  bill_row_id uuid not null references public.bill_rows(id) on delete cascade,
  from_stage_id uuid references public.workflow_stages(id),
  to_stage_id uuid not null references public.workflow_stages(id),
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.bill_comments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 7.5 attachments
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('bill','bill_row')),
  owner_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 7.6 audit
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- helpful indexes
create index on public.bills (customer_id) where deleted_at is null;
create index on public.bill_rows (bill_id) where deleted_at is null;
create index on public.order_status_history (bill_row_id);
create index on public.bill_comments (bill_id) where deleted_at is null;
create index on public.attachments (owner_type, owner_id) where deleted_at is null;
create index on public.workflow_stages (template_id) where deleted_at is null;
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db reset`
Expected: migration `0001` applies with no errors.

- [ ] **Step 3: Write `supabase/tests/schema.test.sql`**

```sql
-- expect: every table exists
select tablename from pg_tables where schemaname = 'public' order by tablename;
-- manual assert: user_types, bill_statuses, organization_settings, profiles, customers,
-- workflow_templates, workflow_stages, order_types, bills, bill_rows,
-- order_status_history, bill_comments, attachments, audit_logs
```
Run: `supabase db execute --file supabase/tests/schema.test.sql`
Expected: all 14 table names listed.

- [ ] **Step 4: Commit**

Report ready to commit: `feat(db): add core schema migration (all phase tables)`

---

## Task 7: Migration 0002 — functions & triggers

**Files:**
- Create: `supabase/migrations/0002_functions_triggers.sql`
- Test: `supabase/tests/triggers.test.sql`

**Interfaces:**
- Consumes: tables from Task 6.
- Produces (callable names later tasks rely on):
  - `public.current_profile() returns uuid`
  - `public.current_user_type() returns text`
  - `public.is_staff() returns boolean`
  - `public.is_admin() returns boolean`
  - `public.advance_bill_row_stage(p_row_id uuid, p_to_stage_id uuid, p_note text default null) returns void`
  - triggers: profile auto-create on `auth.users`, `updated_at` touch, `bill_number` fill, default bill status fill, bill-row stage init, customer-profile assertion, generic audit.

- [ ] **Step 1: Write `0002_functions_triggers.sql`**

```sql
-- permission helpers (security definer, stable)
create or replace function public.current_profile()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.current_user_type()
returns text language sql stable security definer set search_path = public as $$
  select ut.key
  from public.profiles p
  join public.user_types ut on ut.id = p.user_type_id
  where p.id = auth.uid() and p.deleted_at is null
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_type() in ('admin_member','employee')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_type() = 'admin_member'
$$;

-- updated_at touch
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger t_wt_updated before update on public.workflow_templates for each row execute function public.set_updated_at();
create trigger t_ws_updated before update on public.workflow_stages for each row execute function public.set_updated_at();
create trigger t_ot_updated before update on public.order_types for each row execute function public.set_updated_at();
create trigger t_bills_updated before update on public.bills for each row execute function public.set_updated_at();
create trigger t_bill_rows_updated before update on public.bill_rows for each row execute function public.set_updated_at();

-- new auth user -> profile (+ customers row when type = customer)
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type_key text := coalesce(new.raw_user_meta_data->>'user_type', 'customer');
  v_type_id uuid;
  v_created_by uuid := nullif(new.raw_user_meta_data->>'created_by','')::uuid;
begin
  select id into v_type_id from public.user_types where key = v_type_key;
  if v_type_id is null then
    select id into v_type_id from public.user_types where key = 'customer';
  end if;

  insert into public.profiles (id, user_type_id, full_name, email, created_by)
  values (new.id, v_type_id,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          new.email, v_created_by);

  if v_type_key = 'customer' then
    insert into public.customers (profile_id, created_by) values (new.id, v_created_by);
  end if;

  return new;
end $$;

create trigger t_on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_auth_user();

-- bill number
create or replace function public.set_bill_number()
returns trigger language plpgsql as $$
begin
  if new.bill_number is null or new.bill_number = '' then
    new.bill_number = 'INV-' || lpad(nextval('public.bill_number_seq')::text, 6, '0');
  end if;
  return new;
end $$;
create trigger t_bills_set_number before insert on public.bills for each row execute function public.set_bill_number();

-- default bill status from settings
create or replace function public.set_default_bill_status()
returns trigger language plpgsql as $$
begin
  if new.bill_status_id is null then
    select default_bill_status_id into new.bill_status_id from public.organization_settings where id = true;
  end if;
  return new;
end $$;
create trigger t_bills_default_status before insert on public.bills for each row execute function public.set_default_bill_status();

-- assert customer_id is a customer-type profile
create or replace function public.assert_customer_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  select ut.key into v_key
  from public.profiles p join public.user_types ut on ut.id = p.user_type_id
  where p.id = new.customer_id;
  if v_key is distinct from 'customer' then
    raise exception 'bills.customer_id % is not a customer-type profile', new.customer_id;
  end if;
  return new;
end $$;
create trigger t_bills_assert_customer before insert or update on public.bills for each row execute function public.assert_customer_profile();

-- init bill_row stage from its order type's first workflow stage
create or replace function public.init_bill_row_stage()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_stage uuid;
begin
  if new.order_type_id is not null and new.current_stage_id is null then
    select ws.id into v_stage
    from public.order_types ot
    join public.workflow_stages ws on ws.template_id = ot.workflow_template_id and ws.deleted_at is null
    where ot.id = new.order_type_id
    order by ws.sort_order asc
    limit 1;
    new.current_stage_id = v_stage;
  end if;
  return new;
end $$;
create trigger t_bill_rows_init_stage before insert or update on public.bill_rows for each row execute function public.init_bill_row_stage();

-- advance a bill row's stage (used from Phase 4)
create or replace function public.advance_bill_row_stage(p_row_id uuid, p_to_stage_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_from uuid;
begin
  if not public.is_staff() then
    raise exception 'only staff can advance order stages';
  end if;
  select current_stage_id into v_from from public.bill_rows where id = p_row_id;
  update public.bill_rows set current_stage_id = p_to_stage_id where id = p_row_id;
  insert into public.order_status_history (bill_row_id, from_stage_id, to_stage_id, changed_by, note)
  values (p_row_id, v_from, p_to_stage_id, public.current_profile(), p_note);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (public.current_profile(), 'status_change', 'bill_rows', p_row_id,
          jsonb_build_object('from', v_from, 'to', p_to_stage_id));
end $$;

-- generic audit for create/update/soft-delete
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_action text;
begin
  if tg_op = 'INSERT' then v_action = 'create';
  elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then v_action = 'delete';
  elsif tg_op = 'UPDATE' then v_action = 'update';
  else v_action = lower(tg_op);
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (public.current_profile(), v_action, tg_table_name,
          case when tg_op = 'DELETE' then old.id else new.id end);
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger t_audit_bills after insert or update on public.bills for each row execute function public.audit_row_change();
create trigger t_audit_bill_rows after insert or update on public.bill_rows for each row execute function public.audit_row_change();
create trigger t_audit_customers after insert or update on public.customers for each row execute function public.audit_row_change();
create trigger t_audit_order_types after insert or update on public.order_types for each row execute function public.audit_row_change();
create trigger t_audit_workflow_templates after insert or update on public.workflow_templates for each row execute function public.audit_row_change();
```

- [ ] **Step 2: Apply**

Run: `supabase db reset`
Expected: `0001` + `0002` apply cleanly.

- [ ] **Step 3: Write `supabase/tests/triggers.test.sql`**

```sql
-- seed a user_type + a status + settings so inserts work (mirrors 0004; safe if run after reset+seed)
-- 1. auth user -> profile auto-created
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000001', 't1@example.com', '{"user_type":"customer","full_name":"Test One"}');
select count(*) = 1 as profile_created from public.profiles where id = '00000000-0000-0000-0000-000000000001';
select count(*) = 1 as customer_created from public.customers where profile_id = '00000000-0000-0000-0000-000000000001';

-- 2. bill number + default status auto-filled
insert into public.bills (customer_id) values ('00000000-0000-0000-0000-000000000001') returning bill_number, bill_status_id;
-- manual assert: bill_number matches ^INV-\d{6}$ and bill_status_id is not null
```

- [ ] **Step 4: Run trigger tests**

Run: `supabase db reset && supabase db execute --file supabase/migrations/0004_seed.sql` (once Task 9 exists) then `supabase db execute --file supabase/tests/triggers.test.sql`.
Until Task 9 exists, run this test after Task 9. Expected: `profile_created = t`, `customer_created = t`, `bill_number` like `INV-000001`.

- [ ] **Step 5: Commit**

Report ready to commit: `feat(db): add permission helpers, triggers, and stage-advance RPC`

---

## Task 8: Migration 0003 — RLS policies

**Files:**
- Create: `supabase/migrations/0003_rls_policies.sql`
- Test: `supabase/tests/rls.test.sql`

**Interfaces:**
- Consumes: helpers `is_staff()`, `is_admin()`, `current_profile()` from Task 7.
- Produces: RLS enabled on all 14 tables + storage policy, matching spec §8.

- [ ] **Step 1: Write `0003_rls_policies.sql`**

Enable RLS on every table, then add policies per spec §8. Pattern:
```sql
alter table public.user_types enable row level security;
alter table public.bill_statuses enable row level security;
alter table public.organization_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_stages enable row level security;
alter table public.order_types enable row level security;
alter table public.bills enable row level security;
alter table public.bill_rows enable row level security;
alter table public.order_status_history enable row level security;
alter table public.bill_comments enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;

-- lookup tables: any authenticated user reads
create policy read_user_types on public.user_types for select to authenticated using (true);
create policy read_bill_statuses on public.bill_statuses for select to authenticated using (true);

-- organization_settings: read all authenticated; write admin only
create policy read_org_settings on public.organization_settings for select to authenticated using (true);
create policy write_org_settings on public.organization_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_insert on public.profiles for insert to authenticated
  with check (public.is_admin());

-- customers
create policy customers_read on public.customers for select to authenticated
  using (deleted_at is null and (profile_id = auth.uid() or public.is_staff()));
create policy customers_staff_write on public.customers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- workflow_templates / workflow_stages / order_types: staff read, admin write
create policy wt_read on public.workflow_templates for select to authenticated using (deleted_at is null and public.is_staff());
create policy wt_write on public.workflow_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ws_read on public.workflow_stages for select to authenticated using (deleted_at is null and public.is_staff());
create policy ws_write on public.workflow_stages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ot_read on public.order_types for select to authenticated using (deleted_at is null and public.is_staff());
create policy ot_write on public.order_types for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bills
create policy bills_read on public.bills for select to authenticated
  using (deleted_at is null and (public.is_staff() or customer_id = auth.uid()));
create policy bills_staff_write on public.bills for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- bill_rows follow parent bill
create policy bill_rows_read on public.bill_rows for select to authenticated
  using (deleted_at is null and exists (
    select 1 from public.bills b where b.id = bill_id and b.deleted_at is null
      and (public.is_staff() or b.customer_id = auth.uid())));
create policy bill_rows_staff_write on public.bill_rows for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- order_status_history: read follows parent bill; writes go through the RPC (security definer), so no insert policy needed
create policy osh_read on public.order_status_history for select to authenticated
  using (exists (
    select 1 from public.bill_rows r join public.bills b on b.id = r.bill_id
    where r.id = bill_row_id and (public.is_staff() or b.customer_id = auth.uid())));

-- bill_comments: staff full; customer read + insert on own bills
create policy comments_read on public.bill_comments for select to authenticated
  using (deleted_at is null and exists (
    select 1 from public.bills b where b.id = bill_id
      and (public.is_staff() or b.customer_id = auth.uid())));
create policy comments_insert on public.bill_comments for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.bills b where b.id = bill_id
      and (public.is_staff() or b.customer_id = auth.uid())));
create policy comments_staff_update on public.bill_comments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- attachments: staff full; customer read on own bills
create policy attachments_read on public.attachments for select to authenticated
  using (deleted_at is null and (
    public.is_staff() or exists (
      select 1 from public.bills b where b.id = owner_id and owner_type = 'bill' and b.customer_id = auth.uid())
    or exists (
      select 1 from public.bill_rows r join public.bills b on b.id = r.bill_id
      where r.id = owner_id and owner_type = 'bill_row' and b.customer_id = auth.uid())));
create policy attachments_staff_write on public.attachments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- audit_logs: admin read only
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());
```

- [ ] **Step 2: Storage bucket + policy**

Append:
```sql
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments staff all" on storage.objects for all to authenticated
  using (bucket_id = 'attachments' and public.is_staff())
  with check (bucket_id = 'attachments' and public.is_staff());

create policy "attachments customer read own" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and exists (
    select 1 from public.bills b
    where b.customer_id = auth.uid()
      and (storage.foldername(name))[1] = 'bill'
      and (storage.foldername(name))[2] = b.id::text));
```
(Path convention: `bill/<bill_id>/<file>` and `bill_row/<row_id>/<file>` — confirmed in Phase 4; customer read covers the `bill/` case, sufficient for Phase 1.)

- [ ] **Step 3: Apply**

Run: `supabase db reset` — Expected: `0001`–`0003` apply cleanly.

- [ ] **Step 4: Write `supabase/tests/rls.test.sql`**

```sql
-- run AFTER reset + seed (0004). Create two auth users: one staff, one customer.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000aa','staff@example.com','{"user_type":"admin_member"}'),
  ('00000000-0000-0000-0000-0000000000bb','cust@example.com','{"user_type":"customer"}'),
  ('00000000-0000-0000-0000-0000000000cc','cust2@example.com','{"user_type":"customer"}');

insert into public.bills (id, customer_id) values
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000bb');

-- as customer bb: sees own bill
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}';
select count(*) = 1 as bb_sees_own from public.bills;

-- as customer cc: sees zero bills
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000cc","role":"authenticated"}';
select count(*) = 0 as cc_sees_none from public.bills;

-- as staff aa: sees the bill
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}';
select count(*) = 1 as staff_sees_all from public.bills;

-- as customer bb: cannot read workflow_templates
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}';
select count(*) = 0 as cust_no_workflows from public.workflow_templates;
reset role;
```

- [ ] **Step 5: Run RLS tests**

Run: `supabase db reset && supabase db execute --file supabase/tests/rls.test.sql`
Expected: `bb_sees_own = t`, `cc_sees_none = t`, `staff_sees_all = t`, `cust_no_workflows = t`.

- [ ] **Step 6: Commit**

Report ready to commit: `feat(db): add RLS policies for all tables and storage`

---

## Task 9: Migration 0004 — seed data

**Files:**
- Create: `supabase/migrations/0004_seed.sql`
- Test: `supabase/tests/seed.test.sql`

**Interfaces:**
- Consumes: tables from Task 6.
- Produces: 3 `user_types`, 4 `bill_statuses`, 1 `organization_settings` row.

- [ ] **Step 1: Write `0004_seed.sql`**

```sql
insert into public.user_types (key, label, sort_order) values
  ('admin_member','Admin Member',1),
  ('employee','Employee',2),
  ('customer','Customer',3)
on conflict (key) do nothing;

insert into public.bill_statuses (key, label, sort_order, is_terminal) values
  ('pending','Pending',1,false),
  ('active','Active',2,false),
  ('completed','Completed',3,true),
  ('paid','Paid',4,true)
on conflict (key) do nothing;

insert into public.organization_settings (id, default_bill_status_id)
select true, (select id from public.bill_statuses where key = 'pending')
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply**

Run: `supabase db reset` — Expected: all four migrations apply.

- [ ] **Step 3: Write `supabase/tests/seed.test.sql`**

```sql
select count(*) = 3 as user_types_ok from public.user_types;
select count(*) = 4 as bill_statuses_ok from public.bill_statuses;
select count(*) = 1 as settings_ok from public.organization_settings where id = true;
select (default_bill_status_id = (select id from public.bill_statuses where key='pending')) as default_status_ok
from public.organization_settings where id = true;
```

- [ ] **Step 4: Run**

Run: `supabase db execute --file supabase/tests/seed.test.sql`
Expected: all four checks `t`. Then re-run the Task 7 `triggers.test.sql` and Task 8 `rls.test.sql` — Expected: pass.

- [ ] **Step 5: Commit**

Report ready to commit: `feat(db): seed user types, bill statuses, organization settings`

---

## Task 10: Generate database types

**Files:**
- Create: `src/core/supabase/database.types.ts` (generated)
- Modify: `src/core/supabase/client.ts` (type the client)

**Interfaces:**
- Produces: `Database` type from `@/core/supabase/database.types`; `supabase` becomes `SupabaseClient<Database>`.

- [ ] **Step 1: Generate**

Run: `supabase gen types typescript --local > src/core/supabase/database.types.ts`

- [ ] **Step 2: Type the client**

`src/core/supabase/client.ts`:
```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/core/supabase/database.types'
import { env } from '@/core/config/env'

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 4: Commit**

Report ready to commit: `chore(db): generate typescript types from schema`

---

## Task 11: `admin-create-user` Edge Function

**Files:**
- Create: `supabase/functions/admin-create-user/index.ts`, `supabase/functions/admin-create-user/deno.json`
- Test: `supabase/functions/admin-create-user/index.test.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (function env, auto-provided locally).
- Produces: `POST /functions/v1/admin-create-user` with body `{ email, full_name, phone?, user_type: 'admin_member'|'employee'|'customer', temp_password }`; requires `Authorization: Bearer <caller access token>`; returns `{ user_id: string }` on 200, `{ error }` on 400/401/403.

- [ ] **Step 1: Write the test**

`supabase/functions/admin-create-user/index.test.ts` (Deno test, run with `supabase functions serve` + fetch, or `deno test --allow-net`):
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const BASE = Deno.env.get('FUNC_BASE') ?? 'http://127.0.0.1:54321/functions/v1'

Deno.test('rejects missing auth', async () => {
  const res = await fetch(`${BASE}/admin-create-user`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'x@y.z', full_name: 'X', user_type: 'customer', temp_password: 'secret123' }),
  })
  assertEquals(res.status, 401)
  await res.body?.cancel()
})

Deno.test('rejects non-admin caller', async () => {
  // FUNC_CUSTOMER_TOKEN = access token for a seeded customer user
  const token = Deno.env.get('FUNC_CUSTOMER_TOKEN')
  if (!token) return // skipped when token not provided
  const res = await fetch(`${BASE}/admin-create-user`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: 'x@y.z', full_name: 'X', user_type: 'customer', temp_password: 'secret123' }),
  })
  assertEquals(res.status, 403)
  await res.body?.cancel()
})
```

- [ ] **Step 2: Run, expect failure**

Run: `supabase functions serve admin-create-user` in one shell, then `deno test --allow-net --allow-env supabase/functions/admin-create-user/index.test.ts`
Expected: connection refused / 404 (function not implemented).

- [ ] **Step 3: Implement `index.ts`**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'missing authorization' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // who is calling?
  const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: uErr } = await caller.auth.getUser()
  if (uErr || !userData.user) return json({ error: 'invalid token' }, 401)

  const { data: type } = await caller
    .from('profiles')
    .select('user_types(key)')
    .eq('id', userData.user.id)
    .single()
  // @ts-ignore nested select shape
  const callerType = type?.user_types?.key
  if (callerType !== 'admin_member') return json({ error: 'forbidden' }, 403)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'invalid json' }, 400) }
  const { email, full_name, phone, user_type, temp_password } = body as Record<string, string>
  if (!email || !full_name || !user_type || !temp_password) return json({ error: 'missing fields' }, 400)
  if (!['admin_member', 'employee', 'customer'].includes(user_type)) return json({ error: 'bad user_type' }, 400)

  const admin = createClient(url, service)
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
    user_metadata: { user_type, full_name, phone: phone ?? null, created_by: userData.user.id },
  })
  if (cErr || !created.user) return json({ error: cErr?.message ?? 'create failed' }, 400)

  return json({ user_id: created.user.id }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
}
```

`deno.json`:
```json
{ "imports": {} }
```

- [ ] **Step 4: Run tests, expect pass**

Restart `supabase functions serve admin-create-user`, re-run the deno test.
Expected: `rejects missing auth` PASS; `rejects non-admin caller` PASS (or skipped if no token supplied).

- [ ] **Step 5: Commit**

Report ready to commit: `feat(functions): add admin-create-user edge function`

---

## Task 12: Permission helpers + auth service/hooks + providers

**Files:**
- Create: `src/core/permissions/permissions.ts`, `src/core/auth/auth.types.ts`, `src/core/auth/auth.service.ts`, `src/core/auth/auth.hooks.ts`, `src/app/providers/AuthProvider.tsx`, `src/app/providers/QueryProvider.tsx`
- Test: `src/core/permissions/permissions.test.ts`, `src/app/providers/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: `supabase` from `@/core/supabase/client`; `Database` types.
- Produces:
  - `type AppProfile = { id: string; userType: 'admin_member'|'employee'|'customer'; fullName: string; email: string; status: string }`
  - `isAdmin(p: AppProfile | null): boolean`, `isStaff(p: AppProfile | null): boolean`, `isCustomer(p: AppProfile | null): boolean`
  - `authService.signInWithPassword(email, password)`, `.signInWithGoogle()`, `.signUpWithPassword(email, password, fullName)`, `.sendPasswordReset(email)`, `.updatePassword(newPassword)`, `.signOut()`
  - `AuthProvider` + `useAuth() => { session: Session | null; profile: AppProfile | null; loading: boolean }`
  - `QueryProvider` wrapping `QueryClientProvider`

- [ ] **Step 1: Install TanStack Query**

```bash
npm install @tanstack/react-query
```

- [ ] **Step 2: Write failing tests**

`src/core/permissions/permissions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isAdmin, isStaff, isCustomer } from '@/core/permissions/permissions'
import type { AppProfile } from '@/core/auth/auth.types'

const mk = (t: AppProfile['userType']): AppProfile => ({ id: '1', userType: t, fullName: '', email: '', status: 'active' })

describe('permissions', () => {
  it('isAdmin only for admin_member', () => {
    expect(isAdmin(mk('admin_member'))).toBe(true)
    expect(isAdmin(mk('employee'))).toBe(false)
    expect(isAdmin(mk('customer'))).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
  it('isStaff for admin_member and employee', () => {
    expect(isStaff(mk('admin_member'))).toBe(true)
    expect(isStaff(mk('employee'))).toBe(true)
    expect(isStaff(mk('customer'))).toBe(false)
    expect(isStaff(null)).toBe(false)
  })
  it('isCustomer only for customer', () => {
    expect(isCustomer(mk('customer'))).toBe(true)
    expect(isCustomer(mk('admin_member'))).toBe(false)
    expect(isCustomer(null)).toBe(false)
  })
})
```

`src/app/providers/AuthProvider.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'

vi.mock('@/core/supabase/client', () => {
  const listeners: Array<(e: string, s: unknown) => void> = []
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
          listeners.push(cb)
          return { data: { subscription: { unsubscribe: () => {} } } }
        },
      },
      from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    },
  }
})

function Probe() {
  const { loading, profile } = useAuth()
  return <div>{loading ? 'loading' : profile ? profile.email : 'anon'}</div>
}

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks())
  it('resolves to anon when there is no session', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument())
  })
})
```

- [ ] **Step 3: Run, expect failure**

Run: `npm test -- permissions AuthProvider` — Expected: FAIL, modules missing.

- [ ] **Step 4: Implement `auth.types.ts`**

```ts
export type UserType = 'admin_member' | 'employee' | 'customer'

export interface AppProfile {
  id: string
  userType: UserType
  fullName: string
  email: string
  status: string
}
```

- [ ] **Step 5: Implement `permissions.ts`**

```ts
import type { AppProfile } from '@/core/auth/auth.types'

export const isAdmin = (p: AppProfile | null): boolean => p?.userType === 'admin_member'
export const isStaff = (p: AppProfile | null): boolean => p?.userType === 'admin_member' || p?.userType === 'employee'
export const isCustomer = (p: AppProfile | null): boolean => p?.userType === 'customer'
```

- [ ] **Step 6: Implement `auth.service.ts`**

```ts
import { supabase } from '@/core/supabase/client'

export const authService = {
  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    }),

  signUpWithPassword: (email: string, password: string, fullName: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, user_type: 'customer' }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    }),

  sendPasswordReset: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),

  updatePassword: (password: string) => supabase.auth.updateUser({ password }),

  signOut: () => supabase.auth.signOut(),
}
```

- [ ] **Step 7: Implement `AuthProvider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/core/supabase/client'
import type { AppProfile, UserType } from '@/core/auth/auth.types'

interface AuthValue { session: Session | null; profile: AppProfile | null; loading: boolean }
const AuthCtx = createContext<AuthValue>({ session: null, profile: null, loading: true })

async function loadProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, status, user_types(key)')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  // @ts-expect-error nested select
  const key = data.user_types?.key as UserType
  return { id: data.id, userType: key, fullName: data.full_name, email: data.email, status: data.status }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      setProfile(data.session ? await loadProfile(data.session.user.id) : null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      setProfile(s ? await loadProfile(s.user.id) : null)
      setLoading(false)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  return <AuthCtx.Provider value={{ session, profile, loading }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
```

- [ ] **Step 8: Implement `auth.hooks.ts` and `QueryProvider.tsx`**

`auth.hooks.ts`:
```ts
import { useAuth } from '@/app/providers/AuthProvider'
import { isAdmin, isStaff, isCustomer } from '@/core/permissions/permissions'

export function useRole() {
  const { profile, loading } = useAuth()
  return { profile, loading, isAdmin: isAdmin(profile), isStaff: isStaff(profile), isCustomer: isCustomer(profile) }
}
```

`QueryProvider.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

- [ ] **Step 9: Run tests, expect pass**

Run: `npm test -- permissions AuthProvider` — Expected: PASS.
Run: `npm run typecheck` — Expected: clean.

- [ ] **Step 10: Commit**

Report ready to commit: `feat(auth): add permission helpers, auth service, AuthProvider, QueryProvider`

---

## Task 13: Routing, guards, layouts, navigation, placeholder pages

**Files:**
- Create: `src/shared/constants/routes.ts`, `src/app/router/AppRouter.tsx`, `src/app/router/ProtectedRoute.tsx`, `src/app/router/RoleRoute.tsx`, `src/layouts/AuthLayout.tsx`, `src/layouts/AppLayout.tsx`, `src/layouts/PortalLayout.tsx`, `src/components/navigation/Sidebar.tsx`, `src/components/navigation/TopBar.tsx`, `src/components/navigation/MobileBottomBar.tsx`, `src/features/dashboard/DashboardPage.tsx`, `src/features/customers/CustomersPage.tsx`, `src/features/bills/BillsPage.tsx`, `src/features/settings/SettingsPage.tsx`, `src/features/portal/PortalHomePage.tsx`, `src/features/portal/PortalBillPage.tsx`
- Modify: `src/app/App.tsx`, `src/main.tsx`
- Test: `src/app/router/RoleRoute.test.tsx`, `src/app/router/ProtectedRoute.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useRole`, `isStaff`, `isCustomer`.
- Produces:
  - `ROUTES` const map from `@/shared/constants/routes`
  - `ProtectedRoute` — renders `<Outlet />` if `session`, else `<Navigate to={ROUTES.login} />`; renders a spinner while `loading`.
  - `RoleRoute` — `props: { allow: 'staff' | 'customer' }`; redirects staff→`/` when `allow='customer'`, customer→`/portal` when `allow='staff'`.
  - `AppRouter` — the full `<Routes>` tree.

- [ ] **Step 1: Install router**

```bash
npm install react-router-dom
```

- [ ] **Step 2: Write `routes.ts`**

```ts
export const ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  authCallback: '/auth/callback',
  dashboard: '/',
  customers: '/customers',
  bills: '/bills',
  settings: '/settings',
  portalHome: '/portal',
  portalBill: '/portal/bills/:id',
} as const
```

- [ ] **Step 3: Write failing guard tests**

`src/app/router/RoleRoute.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleRoute } from '@/app/router/RoleRoute'

function mockAuth(userType: 'admin_member' | 'customer' | null) {
  vi.doMock('@/app/providers/AuthProvider', () => ({
    useAuth: () => ({
      session: userType ? ({ user: { id: '1' } } as never) : null,
      profile: userType ? { id: '1', userType, fullName: '', email: '', status: 'active' } : null,
      loading: false,
    }),
  }))
}

describe('RoleRoute', () => {
  it('redirects a customer away from staff routes', async () => {
    vi.resetModules(); mockAuth('customer')
    const { RoleRoute: RR } = await import('@/app/router/RoleRoute')
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<RR allow="staff" />}>
            <Route path="/staff" element={<div>staff area</div>} />
          </Route>
          <Route path="/portal" element={<div>portal home</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('portal home')).toBeInTheDocument()
  })

  it('lets staff into staff routes', async () => {
    vi.resetModules(); mockAuth('admin_member')
    const { RoleRoute: RR } = await import('@/app/router/RoleRoute')
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<RR allow="staff" />}>
            <Route path="/staff" element={<div>staff area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('staff area')).toBeInTheDocument()
  })
})
```

`src/app/router/ProtectedRoute.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

describe('ProtectedRoute', () => {
  it('redirects to /login without a session', async () => {
    vi.resetModules()
    vi.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({ session: null, profile: null, loading: false }),
    }))
    const { ProtectedRoute } = await import('@/app/router/ProtectedRoute')
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>secret</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('login page')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run, expect failure**

Run: `npm test -- router/` — Expected: FAIL, modules missing.

- [ ] **Step 5: Implement `ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { ROUTES } from '@/shared/constants/routes'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return <div className="grid min-h-dvh place-items-center text-[var(--color-neo-text-secondary)]">Loading…</div>
  return session ? <Outlet /> : <Navigate to={ROUTES.login} replace />
}
```

- [ ] **Step 6: Implement `RoleRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { isStaff, isCustomer } from '@/core/permissions/permissions'
import { ROUTES } from '@/shared/constants/routes'

export function RoleRoute({ allow }: { allow: 'staff' | 'customer' }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="grid min-h-dvh place-items-center text-[var(--color-neo-text-secondary)]">Loading…</div>
  if (allow === 'staff' && !isStaff(profile)) return <Navigate to={ROUTES.portalHome} replace />
  if (allow === 'customer' && !isCustomer(profile)) return <Navigate to={ROUTES.dashboard} replace />
  return <Outlet />
}
```

- [ ] **Step 7: Implement layouts**

- `AuthLayout.tsx` — centered column on `bg-[var(--color-neo-bg)]`, a `max-w-md` `Card` slot via `<Outlet />`, soft radial highlight background. Reference `New folder/src/components/feature/auth/LoginPage.jsx` for the glassmorphic backdrop treatment.
- `AppLayout.tsx` — port the shell from `New folder/src/App.jsx` lines 48–104: `Sidebar` + `TopBar` on `md+`, `MobileBottomBar` under `md`, `<main>` renders `<Outlet />`, Framer Motion page transition. Replace the `currentView` prop wiring with `<NavLink>`s.
- `PortalLayout.tsx` — `TopBar` (logo + sign-out) only, no sidebar; `<main>` renders `<Outlet />`.

- [ ] **Step 8: Implement navigation components**

Port from `New folder/src/components/navigation/*.jsx` to TS. Replace the `onNavigate(view)` callback model with React Router `NavLink to={...}` using `ROUTES`. Staff nav items: Dashboard `/`, Customers `/customers`, Bills `/bills`, Settings `/settings` (icons: `LayoutGrid`, `Users`, `FileText`, `Settings` from lucide-react). `MobileBottomBar` shows the same four on `< md`. `TopBar` shows the org name and a sign-out button calling `authService.signOut()`.

- [ ] **Step 9: Implement placeholder pages**

Each of `DashboardPage`, `CustomersPage`, `BillsPage`, `SettingsPage`, `PortalHomePage`, `PortalBillPage`:
```tsx
export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">Dashboard</h1>
      <p className="mt-2 text-[var(--color-neo-text-secondary)]">Coming in a later phase.</p>
    </div>
  )
}
```
(Change the heading per page. `PortalBillPage` may read `useParams()` and show the `:id`.)

- [ ] **Step 10: Implement `AppRouter.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { RoleRoute } from '@/app/router/RoleRoute'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { PortalLayout } from '@/layouts/PortalLayout'
import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import OAuthCallbackPage from '@/features/auth/OAuthCallbackPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import CustomersPage from '@/features/customers/CustomersPage'
import BillsPage from '@/features/bills/BillsPage'
import SettingsPage from '@/features/settings/SettingsPage'
import PortalHomePage from '@/features/portal/PortalHomePage'
import PortalBillPage from '@/features/portal/PortalBillPage'
import { ROUTES } from '@/shared/constants/routes'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        </Route>
        <Route path={ROUTES.authCallback} element={<OAuthCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allow="staff" />}>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.dashboard} element={<DashboardPage />} />
              <Route path={ROUTES.customers} element={<CustomersPage />} />
              <Route path={ROUTES.bills} element={<BillsPage />} />
              <Route path={ROUTES.settings} element={<SettingsPage />} />
            </Route>
          </Route>
          <Route element={<RoleRoute allow="customer" />}>
            <Route element={<PortalLayout />}>
              <Route path={ROUTES.portalHome} element={<PortalHomePage />} />
              <Route path={ROUTES.portalBill} element={<PortalBillPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 11: Wire `App.tsx` + `main.tsx`**

`App.tsx`:
```tsx
import { QueryProvider } from '@/app/providers/QueryProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ToastProvider } from '@/shared/ui/Toast'
import { AppRouter } from '@/app/router/AppRouter'

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
```

- [ ] **Step 12: Run tests + typecheck + build**

Run: `npm test -- router/` — Expected: PASS.
Run: `npm run typecheck && npm run build` — Expected: clean.

- [ ] **Step 13: Commit**

Report ready to commit: `feat: add routing, guards, layouts, navigation, placeholder pages`

---

## Task 14: Auth screens

**Files:**
- Create: `src/features/auth/LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `OAuthCallbackPage.tsx`
- Test: `src/features/auth/LoginPage.test.tsx`, `src/features/auth/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: `authService` (Task 12), `useAuth`, `Button`, `Card`, `useToast`, `ROUTES`.
- Produces: default-exported page components used by `AppRouter`.

- [ ] **Step 1: Install form libs**

```bash
npm install react-hook-form zod @hookform/resolvers
```

- [ ] **Step 2: Write failing tests**

`src/features/auth/LoginPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const signInWithPassword = vi.fn().mockResolvedValue({ data: {}, error: null })
const signInWithGoogle = vi.fn().mockResolvedValue({ data: {}, error: null })
vi.mock('@/core/auth/auth.service', () => ({ authService: { signInWithPassword, signInWithGoogle } }))
vi.mock('@/app/providers/AuthProvider', () => ({ useAuth: () => ({ session: null, profile: null, loading: false }) }))

import LoginPage from '@/features/auth/LoginPage'

describe('LoginPage', () => {
  it('shows a validation error for an invalid email', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('submits valid credentials', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(signInWithPassword).toHaveBeenCalledWith('a@b.com', 'secret12')
  })
})
```

`src/features/auth/RegisterPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const signUpWithPassword = vi.fn().mockResolvedValue({ data: {}, error: null })
vi.mock('@/core/auth/auth.service', () => ({ authService: { signUpWithPassword, signInWithGoogle: vi.fn() } }))
vi.mock('@/app/providers/AuthProvider', () => ({ useAuth: () => ({ session: null, profile: null, loading: false }) }))

import RegisterPage from '@/features/auth/RegisterPage'

describe('RegisterPage', () => {
  it('submits name, email, password', async () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Roe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@roe.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(signUpWithPassword).toHaveBeenCalledWith('jane@roe.com', 'secret12', 'Jane Roe')
  })
})
```

- [ ] **Step 3: Run, expect failure**

Run: `npm test -- features/auth` — Expected: FAIL, modules missing.

- [ ] **Step 4: Implement `LoginPage.tsx`**

React Hook Form + Zod. Schema: `{ email: z.string().email('Enter a valid email'), password: z.string().min(8, 'At least 8 characters') }`. On submit call `authService.signInWithPassword`; on `error` show a toast; on success `navigate(ROUTES.dashboard)` (the guards then route staff vs customer). A "Continue with Google" `Button` calls `authService.signInWithGoogle()`. Links to `/register` and `/forgot-password`. Inputs must have associated `<label>`s (`htmlFor` / `id`) so the tests' `getByLabelText` works. Use `Card` + `Button` + neo classes.

- [ ] **Step 5: Implement `RegisterPage.tsx`**

Schema: `{ fullName: z.string().min(2), email: z.string().email(), password: z.string().min(8) }`. On submit call `authService.signUpWithPassword(email, password, fullName)`; on success show a toast "Check your email to confirm" and navigate to `/login`. "Continue with Google" button as on login. Link back to `/login`.

- [ ] **Step 6: Implement `ForgotPasswordPage.tsx` + `ResetPasswordPage.tsx`**

- Forgot: one email field; `authService.sendPasswordReset(email)`; always show a neutral success toast ("If that email exists, a reset link is on its way"); link back to `/login`.
- Reset: two password fields (`password`, `confirm`), Zod `.refine` they match; `authService.updatePassword(password)`; on success toast + navigate `/login`. This page is reached from the email link with a recovery token in the URL that `supabase-js` picks up via `detectSessionInUrl`.

- [ ] **Step 7: Implement `OAuthCallbackPage.tsx`**

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { ROUTES } from '@/shared/constants/routes'
import { isStaff } from '@/core/permissions/permissions'

export default function OAuthCallbackPage() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (loading) return
    if (!session) { navigate(ROUTES.login, { replace: true }); return }
    navigate(isStaff(profile) ? ROUTES.dashboard : ROUTES.portalHome, { replace: true })
  }, [loading, session, profile, navigate])
  return <div className="grid min-h-dvh place-items-center text-[var(--color-neo-text-secondary)]">Signing you in…</div>
}
```

- [ ] **Step 8: Run tests, expect pass**

Run: `npm test -- features/auth` — Expected: PASS.
Run: `npm run typecheck && npm run build` — Expected: clean.

- [ ] **Step 9: Manual end-to-end check (local)**

With `supabase start` running and `npm run dev`:
1. Register a new customer → confirm via the Inbucket email UI (`http://127.0.0.1:54324`) → log in → land on `/portal`.
2. In Supabase Studio, change that profile's `user_type_id` to `admin_member` → re-login → land on `/`.
3. Visit `/portal` as the admin → redirected to `/`. Visit `/` as a customer → redirected to `/portal`.

- [ ] **Step 10: Commit**

Report ready to commit: `feat(auth): add login, register, password reset, and OAuth callback screens`

---

## Task 15: Vercel deploy config + README

**Files:**
- Create: `vercel.json`, `README.md`
- Modify: `.env.example` (already created Task 1 — verify)

**Interfaces:** none (config + docs).

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Write `README.md`**

Sections:
- **Overview** — one paragraph from the spec §1.
- **Prerequisites** — Node 20+, npm, Docker Desktop, Supabase CLI.
- **Local setup** —
  ```bash
  npm install
  supabase start
  cp .env.example .env.local   # fill VITE_SUPABASE_URL + anon key from `supabase start`
  npm run dev
  ```
- **Database** — `supabase db reset` re-applies all migrations + seed; `supabase gen types typescript --local > src/core/supabase/database.types.ts` after any schema change.
- **First admin user** — after deploy, in Supabase Studio → Authentication → Add user (email + password, auto-confirm), then Table Editor → `profiles` → set that row's `user_type_id` to the `admin_member` id. (Or call the `admin-create-user` function once an admin exists.)
- **Deployment (Vercel)** — import the repo, framework preset **Vite**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars (from the hosted Supabase project), deploy. Update Supabase Auth redirect URLs to include the Vercel domain.
- **Supabase free-tier restore** — if the project pauses after 7 idle days: Supabase dashboard → project → **Restore** (1–2 min; data retained; keys unchanged). The keep-alive workflow (below) normally prevents this.
- **Keep-alive** — `.github/workflows/keepalive.yml` pings the REST API every 3 days; needs repo secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

- [ ] **Step 3: Verify build output**

Run: `npm run build && npm run preview` — Expected: app serves from `dist/`, deep links (e.g. `/bills`) resolve after refresh only when served through a rewrite; note this is what `vercel.json` provides in production.

- [ ] **Step 4: Commit**

Report ready to commit: `chore: add vercel SPA config and project README`

---

## Task 16: Keep-alive GitHub Action

**Files:**
- Create: `.github/workflows/keepalive.yml`
- Test: manual `workflow_dispatch` run after the repo is on GitHub.

**Interfaces:** none.

- [ ] **Step 1: Write `.github/workflows/keepalive.yml`**

```yaml
name: supabase-keepalive

on:
  schedule:
    - cron: '0 6 */3 * *'   # every 3 days at 06:00 UTC
  workflow_dispatch: {}

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: REST read to reset inactivity timer
        run: |
          set -euo pipefail
          code=$(curl -s -o /dev/null -w '%{http_code}' \
            "${SUPABASE_URL}/rest/v1/bill_statuses?select=id&limit=1" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")
          echo "HTTP $code"
          test "$code" = "200"
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

- [ ] **Step 2: Document the required secrets**

In `README.md` "Keep-alive" section, list repo secrets: `SUPABASE_URL` (e.g. `https://<ref>.supabase.co`), `SUPABASE_ANON_KEY`. Note: GitHub disables scheduled workflows after 60 days of repo inactivity — dispatch it manually or push a commit to re-enable.

- [ ] **Step 3: Post-deploy verification (manual, tracked here)**

After the user pushes to GitHub and adds the secrets: Actions tab → `supabase-keepalive` → Run workflow → expect a green run printing `HTTP 200`.

- [ ] **Step 4: Commit**

Report ready to commit: `ci: add supabase keep-alive workflow`

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| §5 Tech stack | 1, 2, 3, 5, 12, 13, 14 |
| §6 Project structure | 1 (skeleton), filled across 2–16 |
| §7.1–7.6 all tables | 6 |
| §7.7 functions & triggers | 7 |
| §8 RLS + storage policy | 8 |
| §9 Seed data | 9 |
| §10 Auth (providers, linking, sign-up paths, guards) | 11 (edge fn), 12 (service/provider), 13 (guards), 14 (screens). Account-linking + Google credentials are dashboard config — documented in Task 15 README and spec §12. |
| §11 App shell (routes, layouts, state, tokens, responsive) | 2 (tokens), 3–4 (ui), 12 (providers), 13 (routing/layouts/nav) |
| §12 Deployment & keep-alive | 15 (Vercel + README + restore), 16 (cron) |
| §13 Testing scope | 1 (harness), plus tests in 3, 4, 5, 12, 13, 14; SQL tests in 6–9 |
| §14 Definition of done | Verified by the verification/commit steps across all tasks + manual checks in 14 §9 and 16 §3 |

No gap without a task.

**2. Placeholder scan** — no "TBD"/"handle edge cases"/"similar to Task N"/uncoded steps. Port instructions (Tasks 3, 13) name the exact source file and the target interface; the source files physically exist in-repo under `New folder/`.

**3. Type consistency**
- `AppProfile` shape (`{ id, userType, fullName, email, status }`) is defined in Task 12 and consumed identically in Tasks 12, 13, 14.
- `authService` method names (`signInWithPassword`, `signInWithGoogle`, `signUpWithPassword`, `sendPasswordReset`, `updatePassword`, `signOut`) defined in Task 12, used verbatim in Task 14 tests and implementations.
- `ROUTES` keys defined in Task 13 §2, used in Tasks 13 and 14.
- DB helper names (`is_staff`, `is_admin`, `current_profile`, `advance_bill_row_stage`) defined in Task 7, used in Task 8 policies and referenced in spec §7.7.
- `useAuth` return `{ session, profile, loading }` consistent between Task 12 impl and Task 13/14 mocks.
- Ordering note: Task 7's `triggers.test.sql` depends on seed data from Task 9 — the plan calls this out in Task 7 Step 4 (run after Task 9) and Task 9 Step 4 (re-run 7 & 8 tests).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-01-onevo-phase-1-foundation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
