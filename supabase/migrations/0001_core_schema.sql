-- ONEVO core schema — all tables for every phase (spec §7.1–7.6).
-- Conventions: uuid PK default gen_random_uuid(); created_at/updated_at timestamptz default now();
-- deleted_at for soft delete (except append-only order_status_history and audit_logs).

create extension if not exists "pgcrypto";

-- ============================================================
-- 7.1 lookup / config
-- ============================================================

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

-- ============================================================
-- 7.2 users
-- ============================================================

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

-- ============================================================
-- 7.3 workflow & order types
-- ============================================================

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

-- ============================================================
-- 7.4 bills
-- ============================================================

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

-- ============================================================
-- 7.5 attachments
-- ============================================================

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

-- ============================================================
-- 7.6 audit
-- ============================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- indexes
-- ============================================================

create index bills_customer_idx on public.bills (customer_id) where deleted_at is null;
create index bill_rows_bill_idx on public.bill_rows (bill_id) where deleted_at is null;
create index order_status_history_row_idx on public.order_status_history (bill_row_id);
create index bill_comments_bill_idx on public.bill_comments (bill_id) where deleted_at is null;
create index attachments_owner_idx on public.attachments (owner_type, owner_id) where deleted_at is null;
create index workflow_stages_template_idx on public.workflow_stages (template_id) where deleted_at is null;
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
