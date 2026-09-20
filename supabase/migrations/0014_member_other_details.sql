-- 0014_member_other_details.sql — optional "Other details" for admin_member /
-- employee profiles (Contact number, Address, City, NIC, Designation,
-- Department, Date of birth), mirroring how `customers` extends `profiles`
-- for customer-specific fields. All columns are optional.
--
-- Also fixes a real bug in admin-created accounts: handle_new_auth_user()
-- (0013) always inserts profiles.user_type_id as 'customer' at auth.users
-- INSERT time, because admin-create-user's app_metadata (which carries the
-- real role) is only set in a follow-up call *after* the invite — so every
-- admin_member/employee created via the invite flow silently ended up typed
-- as a customer. See supabase/functions/admin-create-user/index.ts for the
-- corresponding fix (re-stamping profiles.user_type_id + dropping the
-- spuriously-created customers row).

create table public.member_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  contact_number text,
  address_line text,
  city text,
  nic text,
  designation text,
  department text,
  date_of_birth date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger t_member_details_updated before update on public.member_details
  for each row execute function public.set_updated_at();

alter table public.member_details enable row level security;

create policy member_details_read on public.member_details for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());
create policy member_details_admin_write on public.member_details for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
