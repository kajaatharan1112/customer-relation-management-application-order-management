# ONEVO "Home" Business CMS Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠ **Built on a DRAFT spec.** Each ⚠ open decision is resolved here with a **provisional ruling** (table below). Confirm with the human before executing.

**Goal:** A customisable "Home" page — Company detail, Album, Product menu + price, Advertisements + discounts — added to the staff nav and made the customer portal's landing page. Admins edit it in place; employees and customers see it read-only.

**Architecture:** A `features/home/` module (Supabase only in `data/`). One migration adds `home_blocks` (which of the 4 blocks are on + order), `products`, `promotions`, `gallery_images`, extends `organization_settings` with company-detail columns, adds a public `content` Storage bucket, and RLS (`select` to any authenticated; write `is_admin()`). `useHomePage()` loads the whole page in one call. `HomePage` renders visible blocks in `sort_order`; the same component with `editable` (admin only) shows inline add/reorder/edit controls. `/portal` renders `HomePage`; the old bills list moves to `/portal/bills`.

**Tech Stack:** React 19, TypeScript, TanStack Query, Tailwind v4 neo tokens, lucide-react, Vitest + Testing Library, Supabase (Postgres + Storage + pgTAP).

**Spec:** `docs/superpowers/specs/2026-09-03-onevo-home-cms-page-design.md`

## Rulings baked into this plan (provisional — veto before executing)

| Spec ⚠ | Ruling |
|---|---|
| ⚠1 draft vs live | **Live immediately.** No draft/publish in v1. |
| ⚠2 portal restructure | `/portal` → `HomePage`; `/portal/bills` → the current `PortalHomePage` list; `PortalLayout` gets a 2-link nav (Home / My orders). `ROUTES.portalHome` stays `'/portal'`; add `ROUTES.portalBills = '/portal/bills'`. |
| ⚠3 block model | `home_blocks` rows: `type ∈ {company,album,products,promotions}`, `sort_order`, `is_visible`. **Each type is a singleton** (one row per type, seeded on migration). `config` omitted in v1. |
| ⚠4 company ↔ org_settings | **Extend `organization_settings`** with `tagline text`, `about text`, `address text`, `phone text`, `email text`, `hours text`, `socials jsonb default '{}'`. |
| ⚠5 product categories | Free-text `category text` on `products`; the renderer groups by category (first-seen order) then `sort_order`. |
| ⚠6 promotions validity | Non-admins: hidden when `now()` outside `[starts_at, ends_at]` (nulls = open-ended). Admins: all shown, with a `Scheduled` / `Expired` badge. |
| ⚠7 images | New **public `content` bucket**. `<img>` + CSS sizing, no thumbnails. Client checks: ≤ 5 MB, `image/png\|jpeg\|webp`. Paths: `content/<kind>/<uuid>.<ext>`. |
| ⚠8 mobile nav | Keep 4 tabs. The topbar brand/logo links to `/home` (staff) / `/portal` (customer). No 5th tab. |
| ⚠9 employee view | Identical read-only render to customers; every edit affordance gated on `isAdmin`. |
| ⚠10 reorder UX | Up/down buttons on blocks and on each list item; they swap `sort_order` with the neighbour. |

---

## Global Constraints

- **Do NOT run git.** `ready to commit: <msg>` per task.
- Supabase access only in `features/home/data/home.repository.ts`.
- camelCase VMs; snake_case rows until mapped.
- Neo tokens only; no new colours. Product/promo/gallery imagery is user content (`<img>`), not chrome — it may be any colour, but all surrounding UI uses tokens.
- Tests colocated; `vi.hoisted` + `vi.mock` for Supabase.
- Definition of done per task: `npm run test` green, `npm run typecheck` clean, `npm run lint` clean (3 pre-existing warnings only). DB tasks: `supabase db reset` applies the migration and the pgTAP file passes.
- **Modifies `supabase/` by ADDING only:** `migrations/00ZZ_home_cms.sql`, `tests/home_cms.test.sql`. Never edit `0001`–`0010`.
- `lucide-react@1.38`: `Home`, `Image`, `Tag`, `Megaphone`, `Building2`, `Plus`, `Pencil`, `Trash2`, `ChevronUp`, `ChevronDown`, `Eye`, `EyeOff`, `Upload`. Substitute nearest + note if missing.
- Effort A (`…-settings-access-member-management`) SHOULD ship first (this plan reuses its `RoleRoute` / `isAdmin` conventions). Effort B is independent.
- Responsive / mobile-first — customers are on phones.

---

## File Structure

```
src/
├── shared/constants/routes.ts                          (modify) + home, portalBills
├── components/navigation/navConfig.tsx / .test.tsx     (modify) + Home (first item)
├── components/navigation/TopBar.tsx                     (modify) brand -> /home link
├── app/router/AppRouter.tsx                            (modify) /home ; /portal split
├── layouts/PortalLayout.tsx                            (modify) Home / My orders nav
├── features/portal/PortalHomePage.tsx                  (unchanged — now the /portal/bills element)
└── features/home/
    ├── home.types.ts                                   (create)
    ├── home.selectors.ts / .test.ts                    (create) visible-blocks, promo-active, group-products
    ├── data/home.repository.ts / .test.ts              (create) load + per-entity CRUD + image upload
    ├── queries/useHomePage.ts                          (create)
    ├── mutations/useHomeMutations.ts                   (create)
    ├── HomePage.tsx / .test.tsx                        (create) viewer + (admin) editor shell
    └── components/blocks/
        ├── CompanyBlock.tsx / .test.tsx                (create) render + edit form
        ├── AlbumBlock.tsx / .test.tsx                  (create)
        ├── ProductsBlock.tsx / .test.tsx              (create)
        └── PromotionsBlock.tsx / .test.tsx            (create)
supabase/migrations/0011_home_cms.sql                   (create)
supabase/tests/home_cms.test.sql                       (create)
e2e/home-cms.spec.ts                                    (create)
```

---

## Task 1: Migration `0011` — tables, org_settings columns, `content` bucket, RLS

**Files:**
- Create: `supabase/migrations/0011_home_cms.sql` (next free number)
- Create: `supabase/tests/home_cms.test.sql`

**Interfaces:**
- Produces:
  - `home_blocks (id uuid pk, type text check (type in ('company','album','products','promotions')) unique, sort_order int not null, is_visible boolean not null default true)` — seeded with the 4 rows (`company` 0, `products` 1, `promotions` 2, `album` 3), `products`+`promotions` `is_visible` default true, `company` true, `album` false.
  - `products (id uuid pk, category text not null default '', name text not null, description text, price numeric not null default 0, image_path text, is_active boolean not null default true, sort_order int not null default 0, deleted_at timestamptz)`.
  - `promotions (id uuid pk, title text not null, body text, image_path text, discount_kind text check (discount_kind in ('percent','amount','text')) default 'text', discount_value text, starts_at timestamptz, ends_at timestamptz, is_active boolean not null default true, sort_order int not null default 0, deleted_at timestamptz)`.
  - `gallery_images (id uuid pk, caption text, image_path text not null, sort_order int not null default 0, deleted_at timestamptz)`.
  - `organization_settings` + `tagline`, `about`, `address`, `phone`, `email`, `hours` (`text`), `socials jsonb not null default '{}'`.
  - RLS on all four new tables: `select to authenticated using (true)`; `all to authenticated using (public.is_admin()) with check (public.is_admin())`. `organization_settings` already has `read_org_settings` (all) + `write_org_settings` (update) — verify the update policy is `public.is_admin()`; if it isn't, add `alter policy` to make write admin-only.
  - Storage: `insert into storage.buckets (id, name, public) values ('content','content',true)`; policies — `select` public (`bucket_id = 'content'`), `insert/update/delete` `to authenticated using (bucket_id = 'content' and public.is_admin())`.

- [ ] **Step 1: Read** `sed -n '1,40p' supabase/migrations/0008_portal_read_policies.sql` (RLS style) and the `storage.objects` policies in `0003`.

- [ ] **Step 2: Write `home_cms.test.sql`** (pgTAP, `plan(9)`):
  - the 4 `home_blocks` rows exist after migration;
  - as a `customer` (set jwt claims to `33333333-…`): can `select` from `products` / `promotions` / `gallery_images` / `home_blocks`; **cannot** `insert` into `products` (RLS violation);
  - as an `employee` (`22222222-…`): same — read yes, `insert` no;
  - as an `admin_member` (`11111111-…`): `insert` into `products` succeeds; `update home_blocks set is_visible` succeeds;
  - `organization_settings` has the new columns (`has_column`).

- [ ] **Step 3: Run — expect FAIL** (`supabase db reset` + pgTAP)

- [ ] **Step 4: Write `0011_home_cms.sql`** per the interfaces. `enable row level security` on each new table. Seed `home_blocks`. Add the `content` bucket + 4 storage policies. `alter table public.organization_settings add column ...` for the 7 fields.

- [ ] **Step 5: Run the pgTAP — expect PASS** (`9..9`)

- [ ] **Step 6: Ready to commit**

`ready to commit: feat(db): 0011 home CMS tables + org fields + content bucket + RLS`

---

## Task 2: `home.types.ts` + `home.selectors.ts`

**Files:**
- Create: `src/features/home/home.types.ts`
- Create: `src/features/home/home.selectors.ts` + `.test.ts`

**Interfaces:**
- Produces (`home.types.ts`):
  ```ts
  export type BlockType = 'company' | 'album' | 'products' | 'promotions'
  export interface HomeBlockVM { type: BlockType; sortOrder: number; isVisible: boolean }
  export interface CompanyVM { name: string; tagline: string; about: string; address: string; phone: string; email: string; hours: string; logoPath: string | null; socials: Record<string, string> }
  export interface ProductVM { id: string; category: string; name: string; description: string | null; price: number; imagePath: string | null; isActive: boolean; sortOrder: number }
  export interface PromotionVM { id: string; title: string; body: string | null; imagePath: string | null; discountKind: 'percent' | 'amount' | 'text'; discountValue: string | null; startsAt: string | null; endsAt: string | null; isActive: boolean; sortOrder: number }
  export interface GalleryImageVM { id: string; caption: string | null; imagePath: string; sortOrder: number }
  export interface HomePageVM { blocks: HomeBlockVM[]; company: CompanyVM; products: ProductVM[]; promotions: PromotionVM[]; gallery: GalleryImageVM[] }
  ```
- Produces (`home.selectors.ts`):
  - `visibleBlocks(blocks: HomeBlockVM[]): HomeBlockVM[]` — `is_visible`, sorted by `sortOrder`.
  - `promotionState(p: PromotionVM, now?: Date): 'live' | 'scheduled' | 'expired'`.
  - `activePromotionsForViewer(promos: PromotionVM[], isAdmin: boolean, now?: Date): PromotionVM[]` — admins get all (sorted); others get only `isActive && promotionState === 'live'`.
  - `groupProducts(products: ProductVM[]): { category: string; items: ProductVM[] }[]` — first-seen category order; items filtered to `isActive` for non-admin callers is done in the component, not here (here: all, sorted by `sortOrder`).

- [ ] **Step 1: Write the failing test** `home.selectors.test.ts`

```ts
import { visibleBlocks, promotionState, activePromotionsForViewer, groupProducts } from '@/features/home/home.selectors'

const now = new Date('2026-09-03T12:00:00')
const promo = (o: Partial<import('@/features/home/home.types').PromotionVM>) => ({
  id: 'x', title: 'T', body: null, imagePath: null, discountKind: 'text' as const,
  discountValue: null, startsAt: null, endsAt: null, isActive: true, sortOrder: 0, ...o,
})

it('promotionState', () => {
  expect(promotionState(promo({ startsAt: '2026-10-01' }), now)).toBe('scheduled')
  expect(promotionState(promo({ endsAt: '2026-08-01' }), now)).toBe('expired')
  expect(promotionState(promo({ startsAt: '2026-08-01', endsAt: '2026-10-01' }), now)).toBe('live')
})
it('activePromotionsForViewer hides non-live for non-admins, shows all to admin', () => {
  const list = [promo({ id: 'a' }), promo({ id: 'b', endsAt: '2026-01-01' })]
  expect(activePromotionsForViewer(list, false, now).map((p) => p.id)).toEqual(['a'])
  expect(activePromotionsForViewer(list, true, now).map((p) => p.id)).toEqual(['a', 'b'])
})
it('visibleBlocks + groupProducts', () => {
  expect(visibleBlocks([{ type: 'album', sortOrder: 3, isVisible: false }, { type: 'company', sortOrder: 0, isVisible: true }]).map((b) => b.type)).toEqual(['company'])
  const g = groupProducts([
    { id: '1', category: 'Cakes', name: 'A', description: null, price: 1, imagePath: null, isActive: true, sortOrder: 1 },
    { id: '2', category: 'Drinks', name: 'B', description: null, price: 2, imagePath: null, isActive: true, sortOrder: 0 },
    { id: '3', category: 'Cakes', name: 'C', description: null, price: 3, imagePath: null, isActive: true, sortOrder: 0 },
  ])
  expect(g.map((x) => x.category)).toEqual(['Cakes', 'Drinks'])
  expect(g[0].items.map((i) => i.id)).toEqual(['3', '1'])   // sorted by sortOrder within category
})
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- home.selectors`)

- [ ] **Step 3: Implement** both files per the interfaces.

- [ ] **Step 4: Run — expect PASS**, `npm run typecheck && npm run lint`

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: home CMS VMs + pure selectors`

---

## Task 3: `home.repository.ts`

**Files:**
- Create: `src/features/home/data/home.repository.ts` + `.test.ts`

**Interfaces:**
- Produces `homeRepository` with:
  - `load(): Promise<HomePageVM>` — parallel selects: `home_blocks` (all), `organization_settings` (single row), `products`/`promotions`/`gallery_images` (`deleted_at is null`, order `sort_order`). Maps to VMs.
  - `setBlockVisible(type: BlockType, isVisible: boolean): Promise<void>` — `update home_blocks`.
  - `swapBlockOrder(a: BlockType, b: BlockType): Promise<void>` — swap `sort_order` of two rows (two updates).
  - `saveCompany(input: Omit<CompanyVM,'logoPath'|'socials'> & { socials: Record<string,string> }): Promise<void>` — `update organization_settings` (id = true).
  - `upsertProduct(p: Partial<ProductVM> & { id?: string }): Promise<string>` — insert/update `products`, returns id.
  - `deleteProduct(id: string): Promise<void>` — `update products set deleted_at = now()`.
  - `swapProductOrder(idA: string, idB: string): Promise<void>`.
  - `upsertPromotion` / `deletePromotion` / `swapPromotionOrder` — mirror products.
  - `addGalleryImage({ caption, imagePath }): Promise<string>` / `deleteGalleryImage(id)` / `swapGalleryOrder(a,b)`.
  - `uploadImage(file: File, kind: 'product'|'promo'|'gallery'|'logo'): Promise<string>` — validates size ≤ 5 MB and type ∈ png/jpeg/webp; `supabase.storage.from('content').upload('${kind}/${crypto.randomUUID()}.${ext}', file)`; returns the stored path. `publicUrl(path)`: `supabase.storage.from('content').getPublicUrl(path).data.publicUrl` (a plain helper).

- [ ] **Step 1: Read** `cat src/features/attachments/data/attachment.repository.ts` for the storage upload/`getPublicUrl` pattern, and `bill.repository.test.ts` for the mock.

- [ ] **Step 2: Write the failing test** — mock `supabase` incl. `storage.from().upload/getPublicUrl`. Assert: `load` maps a fixture of each table → `HomePageVM`; `uploadImage` rejects a 6 MB file and a `text/plain` file, accepts a 1 MB png and returns the `product/<uuid>.png` path; `upsertProduct` without id inserts, with id updates; `deleteProduct` sets `deleted_at`; `swapBlockOrder` issues two updates with swapped `sort_order`.

- [ ] **Step 3: Run — expect FAIL**

- [ ] **Step 4: Implement** per the interfaces.

- [ ] **Step 5: Run — expect PASS**, `npm run typecheck && npm run lint`

- [ ] **Step 6: Ready to commit**

`ready to commit: feat: home repository (load + CRUD + content-bucket upload)`

---

## Task 4: `useHomePage` + `useHomeMutations`

**Files:**
- Create: `src/features/home/queries/useHomePage.ts`
- Create: `src/features/home/mutations/useHomeMutations.ts`

**Interfaces:**
- `useHomePage()` → `queryKey: ['home']`, `queryFn: homeRepository.load`, `staleTime: 5 * 60_000`, `placeholderData: keepPreviousData`.
- `useHomeMutations()` returns `{ setBlockVisible, swapBlockOrder, saveCompany, upsertProduct, deleteProduct, swapProductOrder, upsertPromotion, deletePromotion, swapPromotionOrder, addGalleryImage, deleteGalleryImage, swapGalleryOrder, uploadImage }` — each a `useMutation` whose `onSuccess` (except `uploadImage`) `invalidateQueries({ queryKey: ['home'] })`. `uploadImage` is a plain mutation returning the path (no invalidate — the caller then calls an upsert).

- [ ] **Step 1: Implement** both files per the interfaces (behaviour covered by component tests in Tasks 5–8).

- [ ] **Step 2: `npm run typecheck && npm run lint`**

- [ ] **Step 3: Ready to commit**

`ready to commit: feat: useHomePage query + home mutation hooks`

---

## Task 5: `CompanyBlock` (render + edit form)

**Files:**
- Create: `src/features/home/components/blocks/CompanyBlock.tsx` + `.test.tsx`

**Interfaces:**
- `CompanyBlock({ company, editable, onSave }: { company: CompanyVM; editable: boolean; onSave: (input) => Promise<void> })` — read view: logo (`publicUrl(logoPath)`), name, tagline, about, and an address/phone/email/hours info row; edit view (only when `editable` and the user toggles "Edit"): a form for every field + a logo upload (`uploadImage(file,'logo')` then include the path in `onSave`). Cancel/Save.

- [ ] **Step 1: Write the failing test** — render read view shows name/tagline/about/phone; with `editable` an "Edit" button appears; clicking it shows inputs; changing the tagline + Save calls `onSave` with the new value; without `editable` there is no Edit button.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** (neo card; `Building2` icon header).

- [ ] **Step 4: Run — expect PASS**, `npm run typecheck && npm run lint`

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: Home CompanyBlock (view + admin edit)`

---

## Task 6: `ProductsBlock`

**Files:**
- Create: `src/features/home/components/blocks/ProductsBlock.tsx` + `.test.tsx`

**Interfaces:**
- `ProductsBlock({ products, editable, actions }: { products: ProductVM[]; editable: boolean; actions: { upsert; remove; swapOrder; uploadImage } })` — render: `groupProducts` → for each category a heading + a responsive grid of product cards (image, name, description, `formatCurrency(price)`); non-admin sees only `isActive` items; admin sees all with an inactive badge, up/down + Edit + Delete controls, and an "Add product" button opening an inline form (name, category, description, price, active toggle, image upload).

- [ ] **Step 1: Write the failing test** — 2 products in 2 categories render under their category headings with `formatCurrency`; non-admin hides an `isActive: false` product; admin shows it + Edit/Delete/▲▼; "Add product" → form → Save calls `actions.upsert`; ▲ calls `actions.swapOrder(id, prevId)`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** (`Tag` icon header).

- [ ] **Step 4: Run — expect PASS**, `npm run typecheck && npm run lint`

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: Home ProductsBlock (menu + price, admin CRUD)`

---

## Task 7: `PromotionsBlock`

**Files:**
- Create: `src/features/home/components/blocks/PromotionsBlock.tsx` + `.test.tsx`

**Interfaces:**
- `PromotionsBlock({ promotions, editable, actions }: { promotions: PromotionVM[]; editable: boolean; actions: { upsert; remove; swapOrder; uploadImage } })` — render: `activePromotionsForViewer(promotions, editable, now)` → cards (image, title, body, a discount pill from `discountKind`/`discountValue`); admin cards also show a `Scheduled`/`Expired`/`Live` badge (`promotionState`), ▲▼, Edit, Delete, and "Add advertisement" opening a form (title, body, discount kind + value, starts/ends date, active toggle, image).

- [ ] **Step 1: Write the failing test** — a live promo renders for a non-admin; an expired one does not; admin sees both with the `Expired` badge; discount pill shows `20% off` for `{ discountKind: 'percent', discountValue: '20' }`; Add → form → Save calls `actions.upsert`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** (`Megaphone` icon header).

- [ ] **Step 4: Run — expect PASS**, `npm run typecheck && npm run lint`

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: Home PromotionsBlock (ads + discounts, validity-aware)`

---

## Task 8: `AlbumBlock`

**Files:**
- Create: `src/features/home/components/blocks/AlbumBlock.tsx` + `.test.tsx`

**Interfaces:**
- `AlbumBlock({ gallery, editable, actions }: { gallery: GalleryImageVM[]; editable: boolean; actions: { add; remove; swapOrder; uploadImage } })` — render: a responsive image grid with captions; admin: an "Add image" (upload → `actions.add({ caption:'', imagePath })`), per-image ▲▼ + Delete + inline caption edit.

- [ ] **Step 1: Write the failing test** — N images render with captions; non-admin has no controls; admin: Add uploads then calls `actions.add`; Delete calls `actions.remove(id)`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** (`Image` icon header).

- [ ] **Step 4: Run — expect PASS**, `npm run typecheck && npm run lint`

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: Home AlbumBlock (gallery, admin CRUD)`

---

## Task 9: `HomePage` (viewer + admin shell) + routes + nav

**Files:**
- Create: `src/features/home/HomePage.tsx` + `.test.tsx`
- Modify: `src/shared/constants/routes.ts` (+ `home: '/home'`, `portalBills: '/portal/bills'`)
- Modify: `src/components/navigation/navConfig.tsx` + `.test.tsx` (Home first item; still admin-agnostic — all staff see Home)
- Modify: `src/components/navigation/TopBar.tsx` (brand wraps a `<Link to="/home">`)
- Modify: `src/app/router/AppRouter.tsx` (`/home` in the staff `AppLayout` block; `/portal` index → `HomePage`, add `/portal/bills` → `PortalHomePage`)
- Modify: `src/layouts/PortalLayout.tsx` (a 2-link nav: Home `/portal`, My orders `/portal/bills`)

**Interfaces:**
- `HomePage()` — `useHomePage()`; `const { isAdmin } = useRole()`; `editable = isAdmin`. Renders `visibleBlocks(blocks)` in order, each to its block component with `editable` + the relevant slice of the VM + `actions` from `useHomeMutations()`. When `editable`: a top "Page layout" bar with per-block Show/Hide (`EyeOff`/`Eye`) + ▲▼ (calls `swapBlockOrder`). Loading/error states consistent with `DashboardPage`.
- Used by both `/home` (staff `AppLayout`) and `/portal` (customer `PortalLayout`) — the component is layout-agnostic.

- [ ] **Step 1: Write the failing test** `HomePage.test.tsx` — mock `useHomePage` + `useHomeMutations` + `useRole`.
  - non-admin: renders the visible blocks (company + products) in order; no "Page layout" bar; no Add/Edit buttons anywhere.
  - admin: the "Page layout" bar shows Show/Hide + ▲▼ per block; hiding `products` calls `setBlockVisible('products', false)`.
  - loading → "Loading…"; error → "Could not load…".

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- HomePage`)

- [ ] **Step 3: Implement** `HomePage.tsx`; add the route constants; `navConfig` — prepend `{ to: ROUTES.home, label: 'Home', shortLabel: 'Home', icon: Home }` to `STAFF_NAV` **and** update `sidebarNavFor` (Effort A) / `SIDEBAR_NAV` to include it first. **Mobile bar:** `STAFF_NAV` gains Home as item 0 → that would make 5 mobile tabs. Ruling ⚠8 keeps 4 — so instead keep `STAFF_NAV` at 4 (Home replaces nothing; drop "Home" from the *mobile* list) by giving `MobileBottomBar` its own explicit 4-item list `[Home, Customers, Bills, Settings]`... **reconsider:** simplest is `MobileBottomBar` maps `STAFF_NAV.slice(0,4)` after Home is prepended → tabs become Home/Customers/Bills/Settings (Sales already wasn't there; Settings stays). Verify `navConfig.test.tsx` still asserts 4 mobile tabs and update the expected labels.
  `TopBar.tsx`: wrap the existing brand `<span>`/logo in `<Link to={ROUTES.home}>`.
  `AppRouter.tsx`: add `<Route path={ROUTES.home} element={<HomePage />} />` in the staff block (first); change `<Route path={ROUTES.portalHome} element={<PortalHomePage />} />` to `element={<HomePage />}` and add `<Route path={ROUTES.portalBills} element={<PortalHomePage />} />`.
  `PortalLayout.tsx`: add a nav under the header with two `NavLink`s.

- [ ] **Step 4: Run — expect PASS**; `npm run test` (full) — fix any nav test fallout; `npm run typecheck`; `npm run lint`.

- [ ] **Step 5: Ready to commit**

`ready to commit: feat: HomePage viewer/editor + /home & /portal wiring`

---

## Task 10: e2e

**Files:**
- Create: `e2e/home-cms.spec.ts`

- [ ] **Step 1: Write the spec** (admin + customer storageState):
  - admin at `/home`: sees the "Page layout" bar; adds a product (name + price + category), asserts it appears under its category heading.
  - admin adds a promotion with `ends_at` in the past → asserts it shows with an `Expired` badge for the admin.
  - customer at `/portal`: sees the Home page with the new product; does **not** see the expired promo; no Add/Edit controls anywhere; a "My orders" link goes to `/portal/bills` and shows the bills list.
  - employee at `/home`: sees the page read-only (no "Page layout" bar).

- [ ] **Step 2: Run — expect PASS** (`npx playwright test home-cms`), then full `npx playwright test`.

- [ ] **Step 3: Ready to commit**

`ready to commit: test(e2e): Home CMS admin edit + customer/employee read-only`

---

## Self-Review (completed during planning)

**1. Spec coverage:** `/home` route + customer default (T9) · block renderer, 4 block types (T5–T8) · admin editor: add/remove/reorder/visibility (T5–T9) · data model `home_blocks`/`products`/`promotions`/`gallery_images` + org_settings columns (T1) · RLS customer/employee read-only, admin write (T1 pgTAP) · `content` bucket (T1, T3) · `features/home/` module (T2–T9) · portal restructure `/portal` + `/portal/bills` (T9) · TopBar brand → Home (T9) · mobile nav stays 4 (T9, ruling ⚠8) · tests incl. e2e (every task, T10).

**2. Placeholder scan:** T9 Step 3 spells out the mobile-nav reconciliation concretely (`STAFF_NAV.slice(0,4)` after prepending Home) rather than deferring it. Block components (T5–T8) each carry a concrete failing test + implementation note. No "similar to Task N".

**3. Type consistency:** `HomePageVM` and its member VMs defined in T2, consumed unchanged in T3–T9. `homeRepository` method names in T3 match `useHomeMutations` keys in T4 and the `actions` props threaded into T5–T8. `BlockType` union identical everywhere. `promotionState` / `activePromotionsForViewer` signatures fixed in T2 and used unchanged in T7/T9. Route constants `home` / `portalBills` added in T9 and referenced in `navConfig` / `AppRouter` / `PortalLayout` in the same task.
