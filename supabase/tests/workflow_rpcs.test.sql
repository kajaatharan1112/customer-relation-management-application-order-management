\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'admin2@t.co', '{"user_type":"admin_member"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'cust2@t.co',  '{"user_type":"customer"}');

insert into public.workflow_templates (id, name)
values ('00000000-0000-0000-0000-000000090001', 'T1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';

-- reject: no final stage
do $$
begin
  begin
    perform public.replace_workflow_stages('00000000-0000-0000-0000-000000090001',
      '[{"name":"A","is_final":false},{"name":"B","is_final":false}]'::jsonb);
    raise exception 'FAIL: accepted stages with zero final';
  exception when others then
    if sqlerrm like '%exactly one stage must be marked final%' then raise notice 'OK: zero-final rejected';
    else raise; end if;
  end;
end $$;

-- accept: one final, creates 3 stages in order
select public.replace_workflow_stages('00000000-0000-0000-0000-000000090001',
  '[{"name":"Prep","is_final":false,"color":"#111111"},
    {"name":"Work","is_final":false},
    {"name":"Done","is_final":true}]'::jsonb);

select array_agg(name order by sort_order) = array['Prep','Work','Done'] as order_ok
from public.workflow_stages where template_id = '00000000-0000-0000-0000-000000090001' and deleted_at is null;

-- re-save with one stage removed, one renamed, order changed -> old row soft-deleted, new sort_order contiguous
select public.replace_workflow_stages('00000000-0000-0000-0000-000000090001',
  jsonb_build_array(
    jsonb_build_object('id', (select id from public.workflow_stages where template_id='00000000-0000-0000-0000-000000090001' and name='Done'), 'name', 'Finished', 'is_final', true),
    jsonb_build_object('name', 'New Step', 'is_final', false)
  ));

select count(*) = 2 as live_stage_count
from public.workflow_stages where template_id = '00000000-0000-0000-0000-000000090001' and deleted_at is null;

select array_agg(name order by sort_order) = array['Finished','New Step'] as renumbered_ok
from public.workflow_stages where template_id = '00000000-0000-0000-0000-000000090001' and deleted_at is null;

-- order type referencing the template blocks delete
insert into public.order_types (id, name, workflow_template_id)
values ('00000000-0000-0000-0000-0000000a0001', 'OT1', '00000000-0000-0000-0000-000000090001');

do $$
begin
  begin
    perform public.soft_delete_workflow_template('00000000-0000-0000-0000-000000090001');
    raise exception 'FAIL: deleted a template still referenced by an order type';
  exception when others then
    if sqlerrm like '%still used by order type%' then raise notice 'OK: delete blocked';
    else raise; end if;
  end;
end $$;

-- delete the order type, then the template delete succeeds
select public.soft_delete_order_type('00000000-0000-0000-0000-0000000a0001');
select public.soft_delete_workflow_template('00000000-0000-0000-0000-000000090001');

select (deleted_at is not null) as template_deleted
from public.workflow_templates where id = '00000000-0000-0000-0000-000000090001';

-- non-admin is rejected
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
do $$
begin
  begin
    perform public.replace_workflow_stages('00000000-0000-0000-0000-000000090001', '[{"name":"X","is_final":true}]'::jsonb);
    raise exception 'FAIL: customer edited workflow stages';
  exception when others then
    if sqlerrm like '%only admins%' then raise notice 'OK: customer blocked';
    else raise; end if;
  end;
end $$;

reset role;
rollback;
