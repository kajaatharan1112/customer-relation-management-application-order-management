-- Run against a freshly reset + seeded DB (0009 applied).
-- Seed profiles: admin 1111…, employee 2222…, customer 3333….
\set ON_ERROR_STOP on
begin;

-- The seed has exactly one active admin.
select public.active_admin_count() = 1 as one_active_admin;

set local role authenticated;

-- as the admin: disabling the only admin is refused.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
begin
  begin
    perform public.set_member_status('11111111-1111-1111-1111-111111111111', 'disabled');
    raise exception 'FAIL: disabling the last active admin was allowed';
  exception when others then
    if sqlerrm like '%last active admin%' then
      raise notice 'OK: last-admin disable blocked';
    else raise; end if;
  end;
end $$;

-- add a second admin (via auth.users so the handle_new_user trigger makes the
-- profile), then disabling the first is allowed.
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('99999999-0000-0000-0000-000000000009', 'second@onevo.test', '{"user_type":"admin_member"}');
select public.active_admin_count() = 2 as two_active_admins;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select public.set_member_status('11111111-1111-1111-1111-111111111111', 'disabled');
select (select status from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'disabled'
       as first_admin_disabled;
select (select deleted_at is not null from public.profiles where id = '11111111-1111-1111-1111-111111111111')
       as first_admin_soft_deleted;

-- re-enabling clears deleted_at and status.
select public.set_member_status('11111111-1111-1111-1111-111111111111', 'active');
select (select status = 'active' and deleted_at is null
        from public.profiles where id = '11111111-1111-1111-1111-111111111111') as first_admin_reenabled;

-- as a non-admin (the employee): set_member_status is refused.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
do $$
begin
  begin
    perform public.set_member_status('99999999-0000-0000-0000-000000000009', 'disabled');
    raise exception 'FAIL: a non-admin changed member status';
  exception when others then
    if sqlerrm like '%admin%' then
      raise notice 'OK: non-admin refused';
    else raise; end if;
  end;
end $$;

-- bad status value is rejected.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
do $$
begin
  begin
    perform public.set_member_status('99999999-0000-0000-0000-000000000009', 'banished');
    raise exception 'FAIL: an invalid status was accepted';
  exception when others then
    if sqlerrm like '%active or disabled%' then
      raise notice 'OK: invalid status rejected';
    else raise; end if;
  end;
end $$;

reset role;
rollback;
