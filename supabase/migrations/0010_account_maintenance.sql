-- 0010_account_maintenance.sql — admin data housekeeping.
-- export_tokens: proof that an admin exported eligible data before purging it.
-- maintenance_stats(): row/byte counts, split total vs eligible-to-purge.
-- purge_archived_data(): permanently deletes done bills older than a cut-off
--   (+ their rows / stage history / comments / attachments), single-use per
--   export token, admin only, one audit_logs row.
--
-- "done" at the DB layer = bill_statuses.is_terminal, which lines up with the
-- frontend bucketOf() mapping (completed / paid / delivered -> 'done').

create table public.export_tokens (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  covers_before date not null,
  consumed_at timestamptz
);

alter table public.export_tokens enable row level security;

create policy export_tokens_admin_all on public.export_tokens
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.maintenance_stats(p_before date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_bill_ids uuid[];
  v_row_ids uuid[];
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can view maintenance stats';
  end if;

  select coalesce(array_agg(b.id), '{}') into v_bill_ids
  from public.bills b
  join public.bill_statuses s on s.id = b.bill_status_id
  where s.is_terminal and b.order_date < p_before;

  select coalesce(array_agg(r.id), '{}') into v_row_ids
  from public.bill_rows r
  where r.bill_id = any (v_bill_ids);

  select jsonb_build_object(
    'total', jsonb_build_object(
      'bills', (select count(*) from public.bills),
      'billRows', (select count(*) from public.bill_rows),
      'comments', (select count(*) from public.bill_comments),
      'attachments', (select count(*) from public.attachments),
      'storageBytes', coalesce((select sum(size_bytes) from public.attachments), 0)
    ),
    'eligible', jsonb_build_object(
      'bills', cardinality(v_bill_ids),
      'billRows', cardinality(v_row_ids),
      'comments', (select count(*) from public.bill_comments where bill_id = any (v_bill_ids)),
      'attachments', (
        select count(*) from public.attachments a
        where (a.owner_type = 'bill' and a.owner_id = any (v_bill_ids))
           or (a.owner_type = 'bill_row' and a.owner_id = any (v_row_ids))
      ),
      'storageBytes', coalesce((
        select sum(a.size_bytes) from public.attachments a
        where (a.owner_type = 'bill' and a.owner_id = any (v_bill_ids))
           or (a.owner_type = 'bill_row' and a.owner_id = any (v_row_ids))
      ), 0)
    )
  ) into v;

  return v;
end;
$$;

create or replace function public.purge_archived_data(p_before date, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tok record;
  v_bill_ids uuid[];
  v_row_ids uuid[];
  v_paths text[];
  v_bills int;
  v_rows int;
  v_comments int;
  v_att int;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can purge data';
  end if;

  select * into v_tok from public.export_tokens where id = p_token;
  if v_tok.id is null then
    raise exception 'Unknown export token';
  end if;
  if v_tok.consumed_at is not null then
    raise exception 'This export token was already used';
  end if;
  if v_tok.created_at < now() - interval '24 hours' then
    raise exception 'This export token has expired';
  end if;
  if v_tok.covers_before < p_before then
    raise exception 'The export does not cover this cut-off date';
  end if;

  select coalesce(array_agg(b.id), '{}') into v_bill_ids
  from public.bills b
  join public.bill_statuses s on s.id = b.bill_status_id
  where s.is_terminal and b.order_date < p_before;

  select coalesce(array_agg(r.id), '{}') into v_row_ids
  from public.bill_rows r
  where r.bill_id = any (v_bill_ids);

  select coalesce(array_agg(a.storage_path), '{}') into v_paths
  from public.attachments a
  where (a.owner_type = 'bill' and a.owner_id = any (v_bill_ids))
     or (a.owner_type = 'bill_row' and a.owner_id = any (v_row_ids));

  select count(*) into v_comments from public.bill_comments where bill_id = any (v_bill_ids);
  v_rows := cardinality(v_row_ids);
  v_bills := cardinality(v_bill_ids);

  with d as (
    delete from public.attachments a
    where (a.owner_type = 'bill' and a.owner_id = any (v_bill_ids))
       or (a.owner_type = 'bill_row' and a.owner_id = any (v_row_ids))
    returning 1
  )
  select count(*) into v_att from d;

  -- deleting the bill cascades bill_rows -> order_status_history, and bill_comments
  delete from public.bills where id = any (v_bill_ids);

  update public.export_tokens set consumed_at = now() where id = p_token;

  insert into public.audit_logs (actor_id, action, entity_type, metadata)
  values (
    auth.uid(),
    'purge_archived_data',
    'bill',
    jsonb_build_object(
      'before', p_before,
      'bills', v_bills,
      'billRows', v_rows,
      'comments', v_comments,
      'attachments', v_att,
      'storagePaths', cardinality(v_paths)
    )
  );

  return jsonb_build_object(
    'counts', jsonb_build_object(
      'bills', v_bills, 'billRows', v_rows, 'comments', v_comments,
      'attachments', v_att, 'storageBytes', 0
    ),
    'storage_paths', to_jsonb(v_paths)
  );
end;
$$;

revoke all on function public.maintenance_stats(date) from public;
revoke all on function public.purge_archived_data(date, uuid) from public;
grant execute on function public.maintenance_stats(date) to authenticated;
grant execute on function public.purge_archived_data(date, uuid) to authenticated;
