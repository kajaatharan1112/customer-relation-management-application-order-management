-- ONEVO seed data (spec §9). Minimum only: user types, bill statuses, org settings.
-- No workflow templates / stages / order types — the admin creates those.

insert into public.user_types (key, label, sort_order) values
  ('admin_member', 'Admin Member', 1),
  ('employee', 'Employee', 2),
  ('customer', 'Customer', 3)
on conflict (key) do nothing;

insert into public.bill_statuses (key, label, sort_order, is_terminal) values
  ('pending', 'Pending', 1, false),
  ('active', 'Active', 2, false),
  ('completed', 'Completed', 3, true),
  ('paid', 'Paid', 4, true)
on conflict (key) do nothing;

insert into public.organization_settings (id, default_bill_status_id)
select true, (select id from public.bill_statuses where key = 'pending')
on conflict (id) do nothing;
