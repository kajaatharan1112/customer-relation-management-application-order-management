-- ONEVO functions & triggers (spec §7.7).

-- ============================================================
-- permission helpers (security definer, stable)
-- ============================================================

create or replace function public.current_profile()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.current_user_type()
returns text language sql stable security definer set search_path = public as $$
  select ut.key
  from public.profiles p
  join public.user_types ut on ut.id = p.user_type_id
  where p.id = auth.uid() and p.deleted_at is null
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_type() in ('admin_member','employee')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_type() = 'admin_member'
$$;

-- ============================================================
-- updated_at touch
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger t_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger t_wt_updated before update on public.workflow_templates for each row execute function public.set_updated_at();
create trigger t_ws_updated before update on public.workflow_stages for each row execute function public.set_updated_at();
create trigger t_ot_updated before update on public.order_types for each row execute function public.set_updated_at();
create trigger t_bills_updated before update on public.bills for each row execute function public.set_updated_at();
create trigger t_bill_rows_updated before update on public.bill_rows for each row execute function public.set_updated_at();

-- ============================================================
-- new auth user -> profile (+ customers row when type = customer)
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type_key text := coalesce(new.raw_user_meta_data->>'user_type', 'customer');
  v_type_id uuid;
  v_created_by uuid := nullif(new.raw_user_meta_data->>'created_by','')::uuid;
begin
  select id into v_type_id from public.user_types where key = v_type_key;
  if v_type_id is null then
    select id into v_type_id from public.user_types where key = 'customer';
    v_type_key := 'customer';
  end if;

  insert into public.profiles (id, user_type_id, full_name, email, created_by)
  values (
    new.id,
    v_type_id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    v_created_by
  );

  if v_type_key = 'customer' then
    insert into public.customers (profile_id, created_by) values (new.id, v_created_by);
  end if;

  return new;
end $$;

create trigger t_on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_auth_user();

-- ============================================================
-- bill number
-- ============================================================

create or replace function public.set_bill_number()
returns trigger language plpgsql as $$
begin
  if new.bill_number is null or new.bill_number = '' then
    new.bill_number = 'INV-' || lpad(nextval('public.bill_number_seq')::text, 6, '0');
  end if;
  return new;
end $$;

create trigger t_bills_set_number before insert on public.bills for each row execute function public.set_bill_number();

-- ============================================================
-- default bill status from settings
-- ============================================================

create or replace function public.set_default_bill_status()
returns trigger language plpgsql as $$
begin
  if new.bill_status_id is null then
    select default_bill_status_id into new.bill_status_id from public.organization_settings where id = true;
  end if;
  return new;
end $$;

create trigger t_bills_default_status before insert on public.bills for each row execute function public.set_default_bill_status();

-- ============================================================
-- assert customer_id is a customer-type profile
-- ============================================================

create or replace function public.assert_customer_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  select ut.key into v_key
  from public.profiles p
  join public.user_types ut on ut.id = p.user_type_id
  where p.id = new.customer_id;
  if v_key is distinct from 'customer' then
    raise exception 'bills.customer_id % is not a customer-type profile', new.customer_id;
  end if;
  return new;
end $$;

create trigger t_bills_assert_customer before insert or update on public.bills for each row execute function public.assert_customer_profile();

-- ============================================================
-- init bill_row stage from its order type's first workflow stage
-- ============================================================

create or replace function public.init_bill_row_stage()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_stage uuid;
begin
  if new.order_type_id is not null and new.current_stage_id is null then
    select ws.id into v_stage
    from public.order_types ot
    join public.workflow_stages ws
      on ws.template_id = ot.workflow_template_id and ws.deleted_at is null
    where ot.id = new.order_type_id
    order by ws.sort_order asc
    limit 1;
    new.current_stage_id = v_stage;
  end if;
  return new;
end $$;

create trigger t_bill_rows_init_stage before insert or update on public.bill_rows for each row execute function public.init_bill_row_stage();

-- ============================================================
-- advance a bill row's stage (used from Phase 4)
-- ============================================================

create or replace function public.advance_bill_row_stage(p_row_id uuid, p_to_stage_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_from uuid;
begin
  if not public.is_staff() then
    raise exception 'only staff can advance order stages';
  end if;
  select current_stage_id into v_from from public.bill_rows where id = p_row_id;
  update public.bill_rows set current_stage_id = p_to_stage_id where id = p_row_id;
  insert into public.order_status_history (bill_row_id, from_stage_id, to_stage_id, changed_by, note)
  values (p_row_id, v_from, p_to_stage_id, public.current_profile(), p_note);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (public.current_profile(), 'status_change', 'bill_rows', p_row_id,
          jsonb_build_object('from', v_from, 'to', p_to_stage_id));
end $$;

-- ============================================================
-- generic audit for create/update/soft-delete
-- ============================================================

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_new jsonb := to_jsonb(new);
  v_entity_id uuid;
begin
  -- Generic over table shape: some tables key on `id`, `customers` keys on
  -- `profile_id`. These triggers are AFTER INSERT OR UPDATE only (never DELETE).
  if tg_op = 'INSERT' then
    v_action := 'create';
  elsif (to_jsonb(old)->>'deleted_at') is null and (v_new->>'deleted_at') is not null then
    v_action := 'delete';
  else
    v_action := 'update';
  end if;

  v_entity_id := coalesce(v_new->>'id', v_new->>'profile_id')::uuid;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (public.current_profile(), v_action, tg_table_name, v_entity_id);

  return null; -- AFTER trigger: return value is ignored
end $$;

create trigger t_audit_bills after insert or update on public.bills for each row execute function public.audit_row_change();
create trigger t_audit_bill_rows after insert or update on public.bill_rows for each row execute function public.audit_row_change();
create trigger t_audit_customers after insert or update on public.customers for each row execute function public.audit_row_change();
create trigger t_audit_order_types after insert or update on public.order_types for each row execute function public.audit_row_change();
create trigger t_audit_workflow_templates after insert or update on public.workflow_templates for each row execute function public.audit_row_change();
