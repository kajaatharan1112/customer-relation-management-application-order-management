\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'stf@t.co', '{"user_type":"employee"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'cst@t.co', '{"user_type":"customer"}');

insert into public.workflow_templates (id, name) values ('00000000-0000-0000-0000-0000000c0001', 'W');
insert into public.workflow_stages (id, template_id, name, sort_order) values
  ('00000000-0000-0000-0000-00000c00a001', '00000000-0000-0000-0000-0000000c0001', 'S1', 1);
insert into public.order_types (id, name, workflow_template_id, fixed_amount)
values ('00000000-0000-0000-0000-0000000d0001', 'OT', '00000000-0000-0000-0000-0000000c0001', 250);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

select public.save_bill(
  jsonb_build_object('customer_id', '00000000-0000-0000-0000-0000000000f2', 'notes', 'hi'),
  jsonb_build_array(
    jsonb_build_object('detail', 'Design', 'order_type_id', '00000000-0000-0000-0000-0000000d0001', 'amount', 250),
    jsonb_build_object('detail', 'Discount', 'amount', -50)
  )
) as bill_id \gset

select (bill_number ~ '^INV-[0-9]{6}$') as number_ok,
       (bill_status_id = (select id from public.bill_statuses where key='pending')) as status_ok
from public.bills where id = :'bill_id';

select count(*) = 2 as rows_ok,
       sum(amount) = 200 as total_ok,
       bool_or(current_stage_id = '00000000-0000-0000-0000-00000c00a001') as stage_set_ok
from public.bill_rows where bill_id = :'bill_id' and deleted_at is null;

select public.save_bill(
  jsonb_build_object('id', :'bill_id', 'customer_id', '00000000-0000-0000-0000-0000000000f2'),
  jsonb_build_array(jsonb_build_object('detail', 'Design only', 'amount', 300))
);
select count(*) = 1 as after_resave_ok from public.bill_rows where bill_id = :'bill_id' and deleted_at is null;

select public.set_bill_status(:'bill_id', 'active');
select (bs.key = 'active') as status_changed_ok
from public.bills b join public.bill_statuses bs on bs.id = b.bill_status_id where b.id = :'bill_id';

do $$
begin
  begin
    perform public.set_bill_status('00000000-0000-0000-0000-0000000000f1'::uuid, 'nope');
    raise exception 'FAIL: accepted bad status key';
  exception when others then
    if sqlerrm like '%unknown bill status%' then raise notice 'OK: bad status rejected';
    else raise; end if;
  end;
end $$;

do $$
begin
  begin
    perform public.soft_delete_customer('00000000-0000-0000-0000-0000000000f2');
    raise exception 'FAIL: deleted a customer with a bill';
  exception when others then
    if sqlerrm like '%active bill%' then raise notice 'OK: customer delete blocked';
    else raise; end if;
  end;
end $$;

select public.soft_delete_bill(:'bill_id');
select public.soft_delete_customer('00000000-0000-0000-0000-0000000000f2');
select (deleted_at is not null) as customer_deleted from public.customers where profile_id = '00000000-0000-0000-0000-0000000000f2';

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
do $$
begin
  begin
    perform public.save_bill('{"customer_id":"00000000-0000-0000-0000-0000000000f2"}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL: customer saved a bill';
  exception when others then
    if sqlerrm like '%only staff%' then raise notice 'OK: customer blocked from save_bill';
    else raise; end if;
  end;
end $$;

reset role;
rollback;
