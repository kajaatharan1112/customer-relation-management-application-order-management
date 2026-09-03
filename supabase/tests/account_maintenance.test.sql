-- Run against a freshly reset + seeded DB (0010 applied).
-- Seed profiles: admin 1111…, employee 2222…, customer 3333…. No bills in the seed.
\set ON_ERROR_STOP on
begin;

-- One old, done bill (2 years back) + one recent done bill.
insert into public.bills (id, bill_number, customer_id, bill_status_id, order_date) values
  ('aaaa1111-0000-0000-0000-000000000001', 'OLD-1',
   '33333333-3333-3333-3333-333333333333',
   (select id from public.bill_statuses where key = 'completed'),
   (current_date - interval '2 years')::date),
  ('bbbb2222-0000-0000-0000-000000000002', 'NEW-1',
   '33333333-3333-3333-3333-333333333333',
   (select id from public.bill_statuses where key = 'completed'),
   (current_date - interval '1 month')::date);
insert into public.bill_rows (id, bill_id, detail, amount) values
  ('cccc3333-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000001', 'old row', 100);
insert into public.bill_comments (bill_id, author_id, body) values
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'archived note');
insert into public.attachments (owner_type, owner_id, storage_path, file_name, size_bytes) values
  ('bill', 'aaaa1111-0000-0000-0000-000000000001', 'bills/OLD-1/proof.pdf', 'proof.pdf', 2048);

set local role authenticated;

-- a non-admin cannot see stats.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
do $$
begin
  begin
    perform public.maintenance_stats((current_date - interval '12 months')::date);
    raise exception 'FAIL: a non-admin read maintenance stats';
  exception when others then
    if sqlerrm like '%admin%' then raise notice 'OK: non-admin stats refused'; else raise; end if;
  end;
end $$;

-- as the admin: stats count the old bill as eligible, the new one as not.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select (public.maintenance_stats((current_date - interval '12 months')::date) -> 'eligible' ->> 'bills')::int = 1
       as one_eligible_bill;
select (public.maintenance_stats((current_date - interval '12 months')::date) -> 'eligible' ->> 'attachments')::int = 1
       as one_eligible_attachment;
-- total counts every bill in the DB (may include unrelated rows), so just check
-- our two inserts are in there.
select (public.maintenance_stats((current_date - interval '12 months')::date) -> 'total' ->> 'bills')::int >= 2
       as total_counts_our_bills;

-- purge without a valid token is refused.
do $$
begin
  begin
    perform public.purge_archived_data((current_date - interval '12 months')::date, gen_random_uuid());
    raise exception 'FAIL: purge ran without a valid token';
  exception when others then
    if sqlerrm like '%export token%' then raise notice 'OK: unknown token refused'; else raise; end if;
  end;
end $$;

-- create an export token, then purge.
reset role;
insert into public.export_tokens (id, created_by, covers_before)
values ('dddd4444-0000-0000-0000-000000000004',
        '11111111-1111-1111-1111-111111111111',
        (current_date - interval '12 months')::date);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select (public.purge_archived_data((current_date - interval '12 months')::date, 'dddd4444-0000-0000-0000-000000000004')
        -> 'counts' ->> 'bills')::int = 1 as purged_one_bill;

-- the old bill (and its row / comment / attachment) is gone; the new bill stays.
select count(*) = 0 as old_bill_gone from public.bills where id = 'aaaa1111-0000-0000-0000-000000000001';
select count(*) = 1 as new_bill_stays from public.bills where id = 'bbbb2222-0000-0000-0000-000000000002';
select count(*) = 0 as old_row_gone from public.bill_rows where bill_id = 'aaaa1111-0000-0000-0000-000000000001';
select count(*) = 0 as old_attachment_gone from public.attachments where owner_id = 'aaaa1111-0000-0000-0000-000000000001';

-- re-using the consumed token is refused.
do $$
begin
  begin
    perform public.purge_archived_data((current_date - interval '12 months')::date, 'dddd4444-0000-0000-0000-000000000004');
    raise exception 'FAIL: a consumed token was accepted';
  exception when others then
    if sqlerrm like '%already used%' then raise notice 'OK: consumed token refused'; else raise; end if;
  end;
end $$;

-- an audit row was written.
reset role;
select count(*) = 1 as audit_row_written from public.audit_logs where action = 'purge_archived_data';

rollback;
