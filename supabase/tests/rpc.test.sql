-- advance_bill_row_stage smoke test. Run against a reset + seeded DB.
\set ON_ERROR_STOP on
begin;

-- staff + customer
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'staff@t.co', '{"user_type":"admin_member"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'cust@t.co',  '{"user_type":"customer"}');

-- a workflow with two stages
insert into public.workflow_templates (id, name)
values ('00000000-0000-0000-0000-0000000f0001', 'WF');
insert into public.workflow_stages (id, template_id, name, sort_order) values
  ('00000000-0000-0000-0000-00000005a001', '00000000-0000-0000-0000-0000000f0001', 'Prep', 1),
  ('00000000-0000-0000-0000-00000005a002', '00000000-0000-0000-0000-0000000f0001', 'Done', 2);

insert into public.order_types (id, name, workflow_template_id)
values ('00000000-0000-0000-0000-000000070001', 'Printing', '00000000-0000-0000-0000-0000000f0001');

insert into public.bills (id, customer_id)
values ('00000000-0000-0000-0000-0000000b0001', '00000000-0000-0000-0000-0000000000c1');

-- row with an order type -> init trigger sets current_stage_id to stage 1 (Prep)
insert into public.bill_rows (id, bill_id, detail, order_type_id)
values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000b0001', 'job', '00000000-0000-0000-0000-000000070001');

select (current_stage_id = '00000000-0000-0000-0000-00000005a001') as initial_stage_ok
from public.bill_rows where id = '00000000-0000-0000-0000-00000000d001';

-- call the RPC as staff
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.advance_bill_row_stage(
  '00000000-0000-0000-0000-00000000d001',
  '00000000-0000-0000-0000-00000005a002',
  'moving to done'
);
reset role;

select (current_stage_id = '00000000-0000-0000-0000-00000005a002') as advanced_ok
from public.bill_rows where id = '00000000-0000-0000-0000-00000000d001';

select count(*) = 1 as history_row_ok
from public.order_status_history
where bill_row_id = '00000000-0000-0000-0000-00000000d001'
  and from_stage_id = '00000000-0000-0000-0000-00000005a001'
  and to_stage_id = '00000000-0000-0000-0000-00000005a002';

select count(*) >= 1 as audit_row_ok
from public.audit_logs
where entity_type = 'bill_rows'
  and entity_id = '00000000-0000-0000-0000-00000000d001'
  and action = 'status_change';

-- non-staff cannot call it
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$
begin
  begin
    perform public.advance_bill_row_stage(
      '00000000-0000-0000-0000-00000000d001',
      '00000000-0000-0000-0000-00000005a001',
      null
    );
    raise exception 'FAIL: customer was allowed to advance a stage';
  exception when others then
    if sqlerrm like '%only staff%' then
      raise notice 'OK: customer blocked from advance_bill_row_stage';
    else
      raise;
    end if;
  end;
end $$;
reset role;

rollback;
