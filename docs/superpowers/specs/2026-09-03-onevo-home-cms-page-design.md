# ONEVO — "Home" Business CMS Page Design Spec (Effort C)

**Document type:** Design specification
**Date:** 2026-09-03
**Status:** DRAFT — large surface, many decisions open (⚠). Needs its own brainstorm
before planning.
**Part of:** the 3-way split. Siblings: `…-settings-access-member-management-design.md`
(A, first), `…-account-maintenance-design.md` (B, last). **C ships second.**

---

## 1. Context

A new **"Home"** page, added to the main navigation, that acts as the business's
customisable front page:

- Blocks: **Company detail**, **Album** (image gallery), **Product menu + price**,
  **Advertisements + discounts**.
- It is the **customer's default landing page** in the portal (today `/portal` opens
  straight to "My Bills").
- **Admin** users edit it in place; **employees and customers see it read-only.**
- "Full and full customizable" — the admin controls which blocks appear, their order, and
  their content.

Today there is no CMS surface. `organization_settings` holds `org_name` / `logo_path` only.
The portal is `PortalLayout` + `PortalHomePage` (a bills list). Staff app is `AppLayout`
with `SIDEBAR_NAV`.

---

## 2. Scope

### In scope

1. **`/home` route** in the staff app (`AppLayout`, all staff can view; only admin sees the
   edit affordances) and **`/portal` root** shows the same page for customers (read-only),
   with "My Bills" moved to `/portal/bills` and linked from the Home page.
2. A **block-based renderer** — an ordered list of typed content blocks:
   - `company` — name, tagline, about text, logo, address, phone, email, hours, map/social
     links.
   - `album` — a titled grid of images with captions.
   - `products` — categorised list of items: name, description, image, **price**
     (`formatCurrency`), optional "from" flag, active toggle.
   - `promotions` — cards: title, body, image, a discount value (percentage or free text),
     validity window (`starts_at` / `ends_at`), active toggle.
   Blocks the admin hasn't added, or has toggled off, don't render.
3. An **admin editor** (inline or a dedicated `/home/edit`): add/remove/reorder blocks;
   per-block forms; image uploads to a new **public `content` Storage bucket**; a "Publish"
   step (draft vs published — ⚠ or edit-live).
4. **Data model** (proposed — ⚠):
   - `home_blocks` — `id`, `type` (`company|album|products|promotions`), `sort_order`,
     `is_visible`, `config jsonb` (block-level settings: title, layout).
   - `products` — `id`, `category`, `name`, `description`, `price numeric`, `image_path`,
     `is_active`, `sort_order`, `deleted_at`.
   - `promotions` — `id`, `title`, `body`, `image_path`, `discount_kind`
     (`percent|amount|text`), `discount_value`, `starts_at`, `ends_at`, `is_active`,
     `sort_order`, `deleted_at`.
   - `gallery_images` — `id`, `caption`, `image_path`, `sort_order`, `deleted_at`.
   - Company block content reuses/extends `organization_settings` (add `tagline`,
     `about`, `address`, `phone`, `email`, `hours`, `socials jsonb`).
5. **RLS:** all four new tables + `organization_settings` — `select` to any `authenticated`
   (staff + customers); `insert/update/delete` `using (public.is_admin())`. `content`
   bucket — public read, admin write.
6. **`features/home/` module:** `home.types.ts`; `data/home.repository.ts` (load the whole
   page in one call; per-entity CRUD for the editor); `queries/useHomePage.ts`;
   `mutations/useHomeMutations.ts`; `components/blocks/*` (one renderer + one editor form
   per block type); `HomePage.tsx` (viewer) + `HomeEditor.tsx` (admin).
7. **Nav:** add "Home" to `SIDEBAR_NAV` (staff) as the first item; the portal shows it as
   the `/portal` index. Mobile bottom bar — ⚠ (add a 5th "Home" tab, or keep 4 and make
   the ONEVO logo go Home).
8. Tests — §5.

### Out of scope

- A public (unauthenticated) marketing site — the page requires login for now.
- E-commerce / ordering from the product menu (display + price only; no cart).
- Applying `promotions` discounts to actual bills (this is display-only marketing).
- Rich-text/WYSIWYG beyond plain multiline text + basic fields in v1.
- Per-block visibility by audience (a block is either on for everyone-logged-in or off).
- Effort A, Effort B.
- Theming/branding controls beyond the logo + the existing neo tokens.

---

## 3. Open decisions (⚠)

1. **Draft vs live.** Does the admin edit a draft and "Publish", or are edits live
   immediately? Draft adds a `status`/`published_snapshot` mechanism.
2. **Portal restructure.** Confirm `/portal` → Home page, `/portal/bills` → the current
   bills list. Does the customer still land somewhere useful for bills, or is Home always
   first with a prominent "My orders" link?
3. **Block model granularity.** One `home_blocks` row per block instance with `config jsonb`
   (flexible, harder to validate) vs fixed columns per block type (rigid, simpler). Also:
   can there be two `album` blocks, or is each type a singleton?
4. **Company block ↔ `organization_settings`.** Extend the singleton table with the extra
   fields, or a separate `company_profile` table? (Extending keeps one source of truth for
   `org_name` + `logo_path`, already used by `formatCurrency` config.)
5. **Product categories.** Free-text `category` string, or a `product_categories` table with
   its own order?
6. **Promotions validity.** Auto-hide when `now()` outside `[starts_at, ends_at]`, or show
   with an "expired" badge for admins only?
7. **Image handling.** New public `content` bucket; max size / allowed types; do we generate
   thumbnails (Edge Function) or just `<img>` with CSS sizing?
8. **Mobile nav 5th tab** vs logo-to-Home (see §2.7).
9. **Employee view.** Same read-only render as customers, or do employees get a link to the
   editor they can't submit? (Spec assumes: identical read-only render; edit affordances
   gated on `isAdmin`.)
10. **Reorder UX.** Drag-and-drop (needs a lib — none installed) vs up/down buttons vs a
    numeric `sort_order` field. Recommendation: up/down buttons for v1.

---

## 4. Architecture (once decisions land)

```
src/features/home/
├── home.types.ts
├── data/home.repository.ts (+ .test.ts)
├── queries/useHomePage.ts
├── mutations/useHomeMutations.ts
└── components/
    ├── HomePage.tsx (+ .test.tsx)         viewer — maps blocks -> renderers
    ├── HomeEditor.tsx (+ .test.tsx)       admin — add/remove/reorder + per-block forms
    └── blocks/{Company,Album,Products,Promotions}{Block,BlockEditor}.tsx (+ tests)
src/
├── shared/constants/routes.ts            + home: '/home'
├── components/navigation/navConfig.tsx   + Home (first sidebar item)
├── app/router/AppRouter.tsx              + /home (staff) ; /portal index -> HomePage ; /portal/bills
├── features/portal/PortalHomePage.tsx    -> becomes /portal/bills content (or renamed)
└── layouts/PortalLayout.tsx              nav to Home / My orders
supabase/
├── migrations/00YY_home_cms.sql          home_blocks, products, promotions, gallery_images,
│                                         org_settings extra cols, RLS, `content` bucket + policy
└── tests/home_cms.test.sql               pgTAP: RLS (customer read / admin write / employee no write)
```

**Flow.** `useHomePage()` → one repository call returning `{ blocks, company, products,
promotions, gallery }` → `HomePage` renders visible blocks in `sort_order`. Editor mutations
are per-entity, each `invalidateQueries(['home'])`. Customer portal renders the same
`HomePage` with `editable={false}`.

---

## 5. Testing (outline)

| File | Asserts |
|---|---|
| `home.repository.test.ts` | full-page load maps every entity → VMs; per-entity create/update/delete post the right payloads; ordering by `sort_order` |
| `HomePage.test.tsx` | renders only `is_visible` blocks in order; product prices via `formatCurrency`; promotions outside their window are hidden (or badged); `editable={false}` shows no edit controls |
| `HomeEditor.test.tsx` | admin can add a block, reorder (up/down), edit a product, delete a promotion — each fires the right mutation; non-admin never reaches the editor (route/`isAdmin` gate) |
| block component tests | one per `{Company,Album,Products,Promotions}` renderer + editor form |
| `supabase/tests/home_cms.test.sql` (pgTAP) | a `customer` can `select` all four tables; a `customer` and an `employee` are refused `insert/update/delete`; an `admin_member` succeeds |
| e2e | admin edits the Home page (adds a product, uploads an image) → a customer login sees it on `/portal`; an employee sees it read-only with no edit buttons |

**DoD per stage:** unit + typecheck + lint green; `supabase db reset` applies the migration
and pgTAP passes; e2e green. **No git.**

---

## 6. Delivery — ordered stages (draft)

1. Decisions workshop (resolve §3) → finalise this spec.
2. Migration `00YY`: tables + `organization_settings` extra columns + RLS + `content`
   bucket + policy + pgTAP.
3. `features/home/` data layer (load + CRUD) + repo tests.
4. Block **renderers** + `HomePage` viewer + tests.
5. `HomeEditor` + block editor forms + image upload + tests.
6. Wiring: `/home` staff route + sidebar item; `/portal` → `HomePage`, `/portal/bills` →
   the old list; `PortalLayout` nav; mobile-nav decision; e2e.

---

## 7. Constraints

As Effort A §8. Additionally: the customer-facing render must stay within the neo token
system and be responsive (mobile-first — customers are likely on phones). No new colour
tokens; product/promo imagery is user content, not chrome. Do NOT run git.
