-- ONEVO Phase 4 — the customer portal needs to render each tracked row's
-- workflow stepper and the history timeline, which requires reading the
-- (non-sensitive) order type / workflow / stage names. Broaden those three
-- read policies from staff-only to any authenticated user. Writes stay
-- admin-only (the separate *_write policies are unchanged).

drop policy if exists ot_read on public.order_types;
create policy ot_read on public.order_types for select to authenticated
  using (deleted_at is null);

drop policy if exists wt_read on public.workflow_templates;
create policy wt_read on public.workflow_templates for select to authenticated
  using (deleted_at is null);

drop policy if exists ws_read on public.workflow_stages;
create policy ws_read on public.workflow_stages for select to authenticated
  using (deleted_at is null);
