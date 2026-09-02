-- ONEVO RLS policies (spec §8). Reads also require deleted_at is null
-- (except append-only order_status_history / audit_logs).

-- ============================================================
-- enable RLS
-- ============================================================

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

-- ============================================================
-- lookup tables: any authenticated user reads
-- ============================================================

create policy read_user_types on public.user_types for select to authenticated using (true);
create policy read_bill_statuses on public.bill_statuses for select to authenticated using (true);

-- ============================================================
-- organization_settings: read all authenticated; write admin only
-- ============================================================

create policy read_org_settings on public.organization_settings for select to authenticated using (true);
create policy write_org_settings on public.organization_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- profiles
-- ============================================================

create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_insert on public.profiles for insert to authenticated
  with check (public.is_admin());

-- ============================================================
-- customers
-- ============================================================

create policy customers_read on public.customers for select to authenticated
  using (deleted_at is null and (profile_id = auth.uid() or public.is_staff()));
create policy customers_staff_write on public.customers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- workflow_templates / workflow_stages / order_types: staff read, admin write
-- ============================================================

create policy wt_read on public.workflow_templates for select to authenticated using (deleted_at is null and public.is_staff());
create policy wt_write on public.workflow_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ws_read on public.workflow_stages for select to authenticated using (deleted_at is null and public.is_staff());
create policy ws_write on public.workflow_stages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ot_read on public.order_types for select to authenticated using (deleted_at is null and public.is_staff());
create policy ot_write on public.order_types for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- bills
-- ============================================================

create policy bills_read on public.bills for select to authenticated
  using (deleted_at is null and (public.is_staff() or customer_id = auth.uid()));
create policy bills_staff_write on public.bills for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- bill_rows follow parent bill
-- ============================================================

create policy bill_rows_read on public.bill_rows for select to authenticated
  using (deleted_at is null and exists (
    select 1 from public.bills b
    where b.id = bill_id and b.deleted_at is null
      and (public.is_staff() or b.customer_id = auth.uid())
  ));
create policy bill_rows_staff_write on public.bill_rows for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- order_status_history: read follows parent bill; writes go through the
-- security-definer RPC, so no insert policy is needed.
-- ============================================================

create policy osh_read on public.order_status_history for select to authenticated
  using (exists (
    select 1 from public.bill_rows r
    join public.bills b on b.id = r.bill_id
    where r.id = bill_row_id and (public.is_staff() or b.customer_id = auth.uid())
  ));

-- ============================================================
-- bill_comments: staff full; customer read + insert on own bills
-- ============================================================

create policy comments_read on public.bill_comments for select to authenticated
  using (deleted_at is null and exists (
    select 1 from public.bills b
    where b.id = bill_id and (public.is_staff() or b.customer_id = auth.uid())
  ));
create policy comments_insert on public.bill_comments for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.bills b
    where b.id = bill_id and (public.is_staff() or b.customer_id = auth.uid())
  ));
create policy comments_staff_update on public.bill_comments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- attachments: staff full; customer read on own bills
-- ============================================================

create policy attachments_read on public.attachments for select to authenticated
  using (deleted_at is null and (
    public.is_staff()
    or exists (
      select 1 from public.bills b
      where b.id = owner_id and owner_type = 'bill' and b.customer_id = auth.uid()
    )
    or exists (
      select 1 from public.bill_rows r
      join public.bills b on b.id = r.bill_id
      where r.id = owner_id and owner_type = 'bill_row' and b.customer_id = auth.uid()
    )
  ));
create policy attachments_staff_write on public.attachments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- audit_logs: admin read only
-- ============================================================

create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

-- ============================================================
-- storage bucket + policies
-- ============================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments staff all" on storage.objects for all to authenticated
  using (bucket_id = 'attachments' and public.is_staff())
  with check (bucket_id = 'attachments' and public.is_staff());

create policy "attachments customer read own" on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.bills b
      where b.customer_id = auth.uid()
        and (storage.foldername(name))[1] = 'bill'
        and (storage.foldername(name))[2] = b.id::text
    )
  );
