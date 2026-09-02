# ONEVO CRM — Frontend Architecture

**Document Type:** Software Architecture Document  
**System Type:** Single-Tenant CRM  
**Frontend:** React + TypeScript + Vite  
**Backend Platform:** Supabase  
**Architecture Style:** Feature-Based Modular Architecture  
**Version:** 1.0  
**Date:** 31 August 2026

---

## 1. Executive Summary

ONEVO CRM is designed as a **single-tenant Customer Relationship Management system**.

Unlike a multi-tenant SaaS architecture, this system does **not** require organization/tenant isolation between multiple customer organizations. A single CRM installation operates against one business dataset.

The application uses:

- React for the frontend UI
- TypeScript for type safety
- Vite for development and production builds
- React Router for application routing
- TanStack Query for server-state management
- Zustand for client/UI state
- Supabase for authentication, PostgreSQL database, storage, and realtime capabilities
- Row Level Security (RLS) for database-level authorization
- Feature-based modular architecture for maintainability

### Core architectural principle

```text
React UI
   ↓
Feature Layer
   ↓
Hooks / Query / Mutation Layer
   ↓
Data Access Layer
   ↓
Supabase Client
   ↓
PostgreSQL / Storage / Realtime
```

The frontend must not contain unrestricted database access logic. Database operations are isolated behind feature-level data-access modules.

---

# 2. System Context

## 2.1 Single-Tenant Model

The system serves **one business/organization**.

```text
ONEVO CRM
    │
    └── Single Business
          │
          ├── Users
          ├── Leads
          ├── Contacts
          ├── Companies
          ├── Deals
          ├── Activities
          ├── Tasks
          ├── Notes
          └── Reports
```

There is no requirement for:

- `tenant_id`
- `organization_id` on every business table
- cross-tenant isolation
- tenant switching
- tenant provisioning
- tenant-level billing
- tenant-specific database routing

A future multi-tenant migration can be considered separately if the product scope changes.

---

# 3. Architecture Goals

## 3.1 Primary Goals

1. Clear separation of UI, business-facing feature logic, state, and data access.
2. Direct and controlled integration with Supabase.
3. Strong database authorization using Supabase RLS.
4. Reusable UI components.
5. Independent feature modules.
6. Lazy loading for large CRM modules.
7. Efficient server-state caching.
8. Predictable error and loading states.
9. Maintainable TypeScript code.
10. Testable application boundaries.

## 3.2 Non-Goals

The architecture does not currently target:

- Multi-tenancy
- Tenant switching
- Micro-frontends
- Separate backend API services
- Multiple database instances per customer
- Cross-organization data isolation

---

# 4. High-Level Architecture

```text
                         ┌───────────────────────┐
                         │     React Browser      │
                         └───────────┬───────────┘
                                     │
                         ┌───────────▼───────────┐
                         │     React Router      │
                         └───────────┬───────────┘
                                     │
                         ┌───────────▼───────────┐
                         │      Feature Layer    │
                         │                       │
                         │ Leads / Contacts      │
                         │ Companies / Deals     │
                         │ Activities / Tasks    │
                         │ Reports / Settings    │
                         └───────────┬───────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
          ┌─────────▼─────────┐             ┌────────▼────────┐
          │ TanStack Query    │             │ Zustand         │
          │ Server State      │             │ UI State        │
          └─────────┬─────────┘             └─────────────────┘
                    │
          ┌─────────▼─────────┐
          │ Data Access Layer │
          │ Repositories      │
          │ Queries/Mutations │
          └─────────┬─────────┘
                    │
          ┌─────────▼─────────┐
          │ Supabase Client   │
          └─────────┬─────────┘
                    │
       ┌────────────┼───────────────────┐
       │            │                   │
┌──────▼──────┐ ┌───▼────────┐ ┌────────▼────────┐
│ PostgreSQL  │ │ Supabase   │ │ Supabase        │
│ Database    │ │ Auth       │ │ Storage/Realtime│
└─────────────┘ └────────────┘ └─────────────────┘
```

---

# 5. Technology Stack

| Layer | Technology |
|---|---|
| UI | React |
| Language | TypeScript |
| Build Tool | Vite |
| Routing | React Router |
| Server State | TanStack Query |
| Client/UI State | Zustand |
| Styling | Tailwind CSS |
| Backend Platform | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Unit/Component Testing | Vitest + React Testing Library |
| E2E Testing | Playwright |
| Accessibility Testing | axe-core |

---

# 6. Project Structure

```text
src/
│
├── app/
│   ├── App.tsx
│   ├── router/
│   │   ├── AppRouter.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── PublicRoute.tsx
│   │
│   └── providers/
│       ├── QueryProvider.tsx
│       └── AuthProvider.tsx
│
├── core/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.hooks.ts
│   │   └── auth.types.ts
│   │
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── database.types.ts
│   │   ├── storage.ts
│   │   └── realtime.ts
│   │
│   ├── permissions/
│   │   ├── permissions.ts
│   │   └── permission.service.ts
│   │
│   ├── errors/
│   │   └── error-handler.ts
│   │
│   └── config/
│       └── env.ts
│
├── shared/
│   ├── ui/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Table/
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── Dropdown/
│   │   └── Loader/
│   │
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── constants/
│
├── layouts/
│   ├── MainLayout.tsx
│   ├── AuthLayout.tsx
│   └── SettingsLayout.tsx
│
├── features/
│   ├── dashboard/
│   ├── leads/
│   ├── contacts/
│   ├── companies/
│   ├── deals/
│   ├── pipelines/
│   ├── activities/
│   ├── tasks/
│   ├── notes/
│   ├── communications/
│   ├── reports/
│   ├── notifications/
│   ├── team/
│   ├── settings/
│   └── admin/
│
└── main.tsx
```

---

# 7. Feature Architecture

Every major CRM domain follows the same internal structure.

Example:

```text
features/leads/

├── pages/
│   ├── LeadListPage.tsx
│   ├── LeadDetailPage.tsx
│   ├── LeadCreatePage.tsx
│   └── LeadEditPage.tsx
│
├── components/
│   ├── LeadTable.tsx
│   ├── LeadCard.tsx
│   ├── LeadForm.tsx
│   ├── LeadFilter.tsx
│   └── LeadStatusBadge.tsx
│
├── queries/
│   ├── useLeads.ts
│   └── useLead.ts
│
├── mutations/
│   ├── useCreateLead.ts
│   ├── useUpdateLead.ts
│   └── useDeleteLead.ts
│
├── data/
│   └── lead.repository.ts
│
├── store/
│   └── lead.store.ts
│
├── types/
│   └── lead.types.ts
│
└── routes.tsx
```

The same pattern is applied to contacts, companies, deals, tasks, activities, and other domains.

---

# 8. Dependency Rules

The architecture follows a controlled dependency direction:

```text
Pages
  ↓
Feature Components
  ↓
Hooks / Queries / Mutations
  ↓
Data Access
  ↓
Supabase
```

### Rules

- Components must not contain complex Supabase queries.
- Pages should not directly manipulate database tables.
- Data-access modules own database interaction.
- Shared UI components must remain domain-neutral.
- Feature modules should not import private implementation details from unrelated features.
- Authentication and permissions belong in `core`.
- Global UI state belongs in Zustand.
- Remote database state belongs in TanStack Query.

---

# 9. Supabase Architecture

Supabase is the primary backend platform.

```text
Supabase
│
├── Auth
│   └── User authentication/session
│
├── PostgreSQL
│   └── CRM data
│
├── RLS
│   └── Database authorization
│
├── Storage
│   └── Documents/attachments
│
└── Realtime
    └── Live CRM updates
```

## 9.1 Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

The Supabase service-role key must never be exposed to the browser.

---

# 10. Data Access Layer

The application uses repositories/data-access modules to isolate Supabase operations.

Example:

```typescript
// lead.repository.ts

import { supabase } from '@/core/supabase/client';

export async function getLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
```

The UI accesses this through a query hook:

```typescript
export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: getLeads
  });
}
```

This creates a clean boundary:

```text
LeadPage
   ↓
useLeads()
   ↓
getLeads()
   ↓
Supabase
```

---

# 11. Server State vs Client State

## 11.1 TanStack Query

Use TanStack Query for:

- Leads
- Contacts
- Companies
- Deals
- Activities
- Tasks
- Reports
- Notifications
- Server-side filtering
- Pagination
- Cache management
- Refetching
- Mutation state

## 11.2 Zustand

Use Zustand for:

- Sidebar state
- Modal state
- Selected record
- Table view mode
- Temporary filters
- UI preferences
- Local workflow state

Do not duplicate the entire Supabase database inside Zustand.

---

# 12. Database Architecture

Recommended core CRM entities:

```text
users
profiles

leads
contacts
companies

pipelines
pipeline_stages
deals

activities
tasks
notes

communications
notifications

attachments
audit_logs
```

Relationships:

```text
Company
   │
   ├── Contacts
   │
   └── Deals

Lead
   │
   └── Conversion
          │
          ├── Contact
          └── Company

Deal
   │
   ├── Pipeline
   ├── Activities
   ├── Tasks
   └── Notes
```

---

# 13. Single-Tenant Database Design

Because the application is single-tenant, business tables do not require a tenant discriminator.

Example:

```text
leads
-----
id
name
email
phone
status
source
assigned_to
created_by
created_at
updated_at
```

No:

```text
tenant_id
organization_id
workspace_id
```

is required solely for tenant isolation.

If a future version becomes multi-tenant, these fields and corresponding RLS policies must be introduced as an architectural migration.

---

# 14. Authentication

Authentication flow:

```text
Login Page
    ↓
Supabase Auth
    ↓
Authenticated Session
    ↓
AuthProvider
    ↓
Current User
    ↓
Permission Resolution
    ↓
Protected Application
```

Supported authentication methods should be defined according to the product requirement.

The frontend should not implement its own password/session system when Supabase Auth is being used.

---

# 15. Authorization

Authentication answers:

```text
Who is the user?
```

Authorization answers:

```text
What can the user access?
```

Example permissions:

```text
leads.view
leads.create
leads.update
leads.delete

contacts.view
contacts.create
contacts.update
contacts.delete

deals.view
deals.create
deals.update
deals.delete

reports.view

settings.manage
users.manage
```

Frontend permission checks control UI visibility.

Database authorization must still be enforced through Supabase RLS.

---

# 16. Row Level Security

RLS is the database-level security boundary.

Example conceptual policy:

```text
Authenticated User
       ↓
PostgreSQL
       ↓
RLS Policy
       ↓
Allowed / Denied
```

Even though this is a single-tenant system, RLS should still be used to prevent unauthorized access based on authenticated user and role.

Example policy concept:

```sql
auth.uid() = created_by
```

or role-based access through a trusted profile/role model.

The exact policies must be defined after the final database schema and permission matrix are approved.

---

# 17. Storage Architecture

Supabase Storage can manage CRM files.

Recommended buckets:

```text
crm-documents
crm-attachments
crm-avatars
crm-exports
```

Example:

```text
features/
  leads/
    data/
      lead.repository.ts
      lead.storage.ts
```

Storage access must also be protected using appropriate policies.

---

# 18. Realtime Architecture

Supabase Realtime can be used where immediate updates provide business value.

Recommended use cases:

- Deal status changes
- Task updates
- Notifications
- Team activity
- Communication updates
- Live dashboard counters

Flow:

```text
User A
  ↓
Supabase Database
  ↓
Realtime Event
  ↓
User B
  ↓
TanStack Query Cache
  ↓
React UI
```

Realtime should not be enabled indiscriminately for every table.

---

# 19. Routing Architecture

Public routes:

```text
/login
/forgot-password
```

Protected routes:

```text
/dashboard
/leads
/contacts
/companies
/deals
/activities
/tasks
/reports
/team
/settings
```

Feature routes should be lazy-loaded where appropriate.

Example:

```typescript
const LeadPage = lazy(
  () => import('@/features/leads/pages/LeadListPage')
);
```

---

# 20. Rendering Strategy

This CRM is primarily an authenticated application.

Recommended strategy:

```text
Authenticated CRM
        ↓
Client-Side Rendering
        ↓
React + Vite
```

Public marketing pages, if added later, may use a separate SSR/SSG-capable application or architecture depending on SEO requirements.

The authenticated CRM does not require SSR merely for database access.

---

# 21. Loading, Error, Empty and Success States

Every data-driven screen must explicitly handle:

```text
Loading
Error
Empty
Success
```

Example:

```tsx
if (isLoading) {
  return <LeadTableSkeleton />;
}

if (isError) {
  return <ErrorState />;
}

if (!leads?.length) {
  return <EmptyState />;
}

return <LeadTable data={leads} />;
```

This rule applies across the CRM.

---

# 22. Search and Filtering

Large CRM datasets must use database-side operations.

Preferred flow:

```text
Search Input
    ↓
Debounce
    ↓
TanStack Query
    ↓
Supabase/PostgreSQL
    ↓
Paginated Result
```

Avoid loading the entire CRM dataset into the browser for filtering.

---

# 23. Pagination

Tables such as:

- Leads
- Contacts
- Companies
- Deals
- Activities
- Audit Logs

should support server-side pagination.

Example:

```text
Database
   ↓
Page 1 → 25 records
Page 2 → 25 records
Page 3 → 25 records
```

The exact page size should be selected based on measured performance and UX requirements.

---

# 24. Error Handling

Standard error categories:

```text
401 → Authentication required
403 → Permission denied
404 → Record not found
409 → Data conflict
422 → Validation failure
429 → Rate limit
5xx → Backend/service failure
Network → Connectivity issue
```

User-facing messages should be understandable.

Technical error details should be logged safely and must not expose secrets.

---

# 25. Validation

Validation should occur at appropriate boundaries:

```text
UI Form
   ↓
Schema Validation
   ↓
Mutation
   ↓
Database Constraints
```

Client validation improves UX.

Database constraints remain authoritative for data integrity.

---

# 26. Audit Logging

CRM systems often require traceability.

Recommended audit events:

```text
CREATE
UPDATE
DELETE
LOGIN
LOGOUT
PERMISSION_CHANGE
STATUS_CHANGE
FILE_UPLOAD
FILE_DELETE
```

Audit logs should capture the minimum information required for operational traceability.

Example:

```text
audit_logs

id
user_id
action
entity_type
entity_id
metadata
created_at
```

Sensitive values should not be stored unnecessarily.

---

# 27. Performance Architecture

Primary techniques:

```text
Code Splitting
Lazy Loading
Server-side Pagination
Database Filtering
TanStack Query Caching
Debounced Search
Virtualized Large Tables
Optimized Images
Selective Realtime
```

Performance should be measured rather than assumed.

Important metrics include:

- Initial load time
- Route transition time
- API/database latency
- Table rendering time
- Bundle size
- Core Web Vitals

---

# 28. Security Requirements

1. Never expose Supabase service-role credentials.
2. Store public Supabase configuration only in frontend environment variables.
3. Enforce authorization at the database level with RLS.
4. Validate user input.
5. Apply least-privilege permissions.
6. Do not trust client-side role checks as the only security mechanism.
7. Protect file storage with access policies.
8. Avoid logging credentials, tokens, or sensitive personal data.
9. Keep dependencies updated.
10. Review database policies before production deployment.

---

# 29. Testing Architecture

## Unit Tests

Use Vitest for:

- Utility functions
- Permission logic
- Data transformation
- Business rules

## Component Tests

Use React Testing Library for:

- Forms
- Tables
- Filters
- Modals
- Loading/error/empty states

## E2E Tests

Use Playwright for:

```text
Login
Lead creation
Contact creation
Deal workflow
Task workflow
Permission restrictions
Logout
```

## Accessibility

Use axe-core for automated accessibility checks.

---

# 30. Environment Configuration

Recommended environments:

```text
.env.local
.env.development
.env.production
```

Example:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Secrets that require server-side trust must not be placed in Vite client environment variables.

---

# 31. Deployment Architecture

```text
                    Internet
                       │
                       ▼
                React Web App
                       │
                       ▼
                Supabase Platform
             ┌─────────┼─────────┐
             │         │         │
             ▼         ▼         ▼
        PostgreSQL    Auth     Storage
             │
             ▼
          Realtime
```

Frontend deployment can use a static hosting/CDN platform compatible with Vite applications.

---

# 32. Development Standards

## TypeScript

- Strict TypeScript enabled.
- Avoid `any`.
- Use generated Supabase database types.
- Prefer explicit domain types.
- Keep shared types domain-neutral.

## React

- Functional components.
- Hooks for reusable behavior.
- Avoid unnecessary global state.
- Prefer composition over deeply coupled components.

## Data Access

- No direct database queries inside reusable UI components.
- Use repositories/data-access modules.
- Use TanStack Query for remote data lifecycle.

## Naming

```text
LeadListPage.tsx
LeadTable.tsx
LeadForm.tsx
useLeads.ts
useCreateLead.ts
lead.repository.ts
lead.types.ts
```

---

# 33. Architecture Decision Summary

| Decision | Choice | Reason |
|---|---|---|
| Frontend | React | Component-based CRM UI |
| Language | TypeScript | Type safety |
| Build | Vite | Fast modern build tooling |
| Routing | React Router | SPA routing |
| Server State | TanStack Query | Cache/query/mutation lifecycle |
| UI State | Zustand | Lightweight client state |
| Backend | Supabase | Integrated backend platform |
| Database | PostgreSQL | Relational CRM data |
| Auth | Supabase Auth | Managed authentication |
| Authorization | RLS + application permissions | Database-level security |
| Files | Supabase Storage | CRM attachments |
| Realtime | Supabase Realtime | Selective live updates |
| Testing | Vitest + RTL + Playwright | Unit/component/E2E coverage |
| Architecture | Feature-based modular | Scalability and maintainability |
| Tenancy | Single tenant | One business dataset |

---

# 34. Architectural Rules — Mandatory

The following rules are mandatory for implementation:

```text
1. React components must not directly own database access.

2. Supabase access must be isolated through data-access modules.

3. TanStack Query owns server state.

4. Zustand owns client/UI state.

5. RLS is the database security boundary.

6. Frontend permission checks are not sufficient security.

7. Service-role credentials must never reach the browser.

8. Large datasets must use server-side pagination/filtering.

9. Every async screen must handle loading/error/empty/success.

10. Feature modules should remain independently maintainable.

11. Shared UI must not contain CRM-specific business logic.

12. Realtime should be enabled only where it provides business value.

13. Single-tenant design must not introduce unnecessary tenant abstractions.

14. Any future multi-tenant requirement must be treated as a deliberate architecture change.
```

---

# 35. Final Architecture

```text
                         ONEVO CRM
                    SINGLE-TENANT SYSTEM
                              │
                    ┌─────────▼─────────┐
                    │       React       │
                    │    TypeScript     │
                    │       Vite        │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Feature Modules  │
                    │                   │
                    │ Leads             │
                    │ Contacts          │
                    │ Companies         │
                    │ Deals             │
                    │ Activities        │
                    │ Tasks             │
                    │ Reports           │
                    │ Settings          │
                    └─────────┬─────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
        ┌────────▼────────┐       ┌────────▼────────┐
        │ TanStack Query  │       │    Zustand       │
        │ Server State    │       │  Client State    │
        └────────┬────────┘       └─────────────────┘
                 │
        ┌────────▼────────┐
        │ Data Access     │
        │ Repository      │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Supabase Client │
        └────────┬────────┘
                 │
       ┌─────────┼─────────────┐
       │         │             │
       ▼         ▼             ▼
 PostgreSQL    Auth         Storage
       │
       ▼
      RLS
       │
       ▼
   Authorization
```

---

## 36. Architecture Status

**Architecture classification:** Single-Tenant CRM  
**Frontend:** React + TypeScript + Vite  
**Backend:** Supabase  
**Database:** PostgreSQL  
**State:** TanStack Query + Zustand  
**Security:** Supabase Auth + RLS  
**Realtime:** Supabase Realtime  
**Storage:** Supabase Storage  
**Testing:** Vitest + React Testing Library + Playwright  
**Deployment model:** Web application + managed Supabase backend

**Important:** This document intentionally removes multi-tenant concepts from the architecture. `tenant_id`, `organization_id`, tenant switching, tenant provisioning, and cross-tenant isolation are not part of the current system design.
