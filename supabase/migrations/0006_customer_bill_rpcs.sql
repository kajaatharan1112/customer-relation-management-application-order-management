-- ONEVO Phase 3 — staff-only RPCs for atomic bill writes and guarded deletes.

-- Phase 1 did not include a running paid total on bills; add it here.
alter table public.bills add column if not exists paid_amount numeric(12,2) not null default 0;

create or replace function public.save_bill(p_bill jsonb, p_rows jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_bill_id uuid;
  v_item jsonb;
  v_idx int := 0;
  v_row_id uuid;
  v_keep uuid[] := '{}';
begin
  if not public.is_staff() then
    raise exception 'only staff can save bills';
  end if;

  v_bill_id := nullif(p_bill->>'id', '')::uuid;

  if v_bill_id is null then
    insert into public.bills (customer_id, order_date, deadline, notes, paid_amount, created_by)
    values (
      (p_bill->>'customer_id')::uuid,
      coalesce((p_bill->>'order_date')::date, current_date),
      nullif(p_bill->>'deadline', '')::date,
      p_bill->>'notes',
      coalesce((p_bill->>'paid_amount')::numeric, 0),
      public.current_profile()
    )
    returning id into v_bill_id;
  else
    update public.bills set
      customer_id = (p_bill->>'customer_id')::uuid,
      order_date  = coalesce((p_bill->>'order_date')::date, order_date),
      deadline    = nullif(p_bill->>'deadline', '')::date,
      notes       = p_bill->>'notes'
    where id = v_bill_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_rows)
  loop
    v_row_id := nullif(v_item->>'id', '')::uuid;

    if v_row_id is not null and exists (
      select 1 from public.bill_rows where id = v_row_id and bill_id = v_bill_id
    ) then
      update public.bill_rows set
        detail = v_item->>'detail',
        order_type_id = nullif(v_item->>'order_type_id', '')::uuid,
        amount = coalesce((v_item->>'amount')::numeric, 0),
        sort_order = v_idx,
        deleted_at = null
      where id = v_row_id;
    else
      insert into public.bill_rows (bill_id, detail, order_type_id, amount, sort_order)
      values (
        v_bill_id,
        v_item->>'detail',
        nullif(v_item->>'order_type_id', '')::uuid,
        coalesce((v_item->>'amount')::numeric, 0),
        v_idx
      )
      returning id into v_row_id;
    end if;

    v_keep := v_keep || v_row_id;
    v_idx := v_idx + 1;
  end loop;

  update public.bill_rows set deleted_at = now()
  where bill_id = v_bill_id and deleted_at is null and not (id = any(v_keep));

  return v_bill_id;
end $$;

create or replace function public.set_bill_status(p_bill_id uuid, p_status_key text)
returns void language plpgsql security definer set search_path = public as $$
declare v_status_id uuid;
begin
  if not public.is_staff() then
    raise exception 'only staff can change bill status';
  end if;
  select id into v_status_id from public.bill_statuses where key = p_status_key;
  if v_status_id is null then
    raise exception 'unknown bill status: %', p_status_key;
  end if;
  update public.bills set bill_status_id = v_status_id where id = p_bill_id;
end $$;

create or replace function public.soft_delete_bill(p_bill_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'only staff can delete bills';
  end if;
  update public.bills set deleted_at = now() where id = p_bill_id;
  update public.bill_rows set deleted_at = now() where bill_id = p_bill_id and deleted_at is null;
end $$;

create or replace function public.soft_delete_customer(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_bill_count int;
begin
  if not public.is_staff() then
    raise exception 'only staff can delete customers';
  end if;
  select count(*) into v_bill_count from public.bills
  where customer_id = p_profile_id and deleted_at is null;
  if v_bill_count > 0 then
    raise exception 'cannot delete: customer has % active bill(s)', v_bill_count;
  end if;
  update public.customers set deleted_at = now() where profile_id = p_profile_id;
  update public.profiles set status = 'disabled' where id = p_profile_id;
end $$;
