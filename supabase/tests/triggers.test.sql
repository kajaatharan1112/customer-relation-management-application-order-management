-- Run against a freshly reset + seeded DB.
\set ON_ERROR_STOP on
begin;

-- 1. auth user -> profile + customers row auto-created
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000001', 't1@example.com',
        '{"user_type":"customer","full_name":"Test One"}');

select count(*) = 1 as profile_created
from public.profiles where id = '00000000-0000-0000-0000-000000000001';

select count(*) = 1 as customer_created
from public.customers where profile_id = '00000000-0000-0000-0000-000000000001';

select (user_type_id = (select id from public.user_types where key = 'customer')) as profile_type_ok
from public.profiles where id = '00000000-0000-0000-0000-000000000001';

-- 2. bill number + default status auto-filled
insert into public.bills (customer_id) values ('00000000-0000-0000-0000-000000000001');

select
  (bill_number ~ '^INV-[0-9]{6}$') as bill_number_ok,
  (bill_status_id = (select id from public.bill_statuses where key = 'pending')) as default_status_ok
from public.bills where customer_id = '00000000-0000-0000-0000-000000000001';

-- 3. assert_customer_profile blocks a non-customer profile
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000002', 'staff1@example.com',
        '{"user_type":"admin_member"}');

do $$
begin
  begin
    insert into public.bills (customer_id) values ('00000000-0000-0000-0000-000000000002');
    raise exception 'FAIL: staff profile was accepted as bill customer';
  exception when others then
    if sqlerrm like '%is not a customer-type profile%' then
      raise notice 'OK: non-customer rejected';
    else
      raise;
    end if;
  end;
end $$;

rollback;
