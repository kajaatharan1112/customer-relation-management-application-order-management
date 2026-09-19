-- Run against a freshly reset + seeded DB.
\set ON_ERROR_STOP on
begin;

-- Two customers + one admin (profiles created by the auth trigger).
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000aa', 'staff@example.com', '{"user_type":"admin_member"}'),
  ('00000000-0000-0000-0000-0000000000bb', 'cust@example.com',  '{"user_type":"customer"}'),
  ('00000000-0000-0000-0000-0000000000cc', 'cust2@example.com', '{"user_type":"customer"}');

insert into public.bills (id, customer_id)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000bb');

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

-- as customer bb: may READ workflow_templates (needed by the portal stepper,
-- opened up in migration 0008) but may NOT write them.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}';
do $$
begin
  begin
    insert into public.workflow_templates (name) values ('hack');
    raise exception 'FAIL: customer wrote a workflow_template';
  exception when others then
    if sqlerrm like '%row-level security%' or sqlerrm like '%violates%' then
      raise notice 'OK: customer cannot write workflow_templates';
    else raise; end if;
  end;
end $$;

-- as customer bb: can read bill_statuses (lookup)
select count(*) = 4 as cust_reads_statuses from public.bill_statuses;

reset role;
rollback;
