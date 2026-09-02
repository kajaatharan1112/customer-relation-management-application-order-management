-- ONEVO Phase 2 — admin-only RPCs for atomic stage reordering and safe deletes.

create or replace function public.replace_workflow_stages(p_template_id uuid, p_stages jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_final_count int;
  v_len int;
  v_item jsonb;
  v_idx int := 0;
  v_id uuid;
  v_keep_ids uuid[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'only admins can edit workflow stages';
  end if;

  select jsonb_array_length(p_stages) into v_len;
  if v_len is null or v_len < 1 then
    raise exception 'a workflow needs at least one stage';
  end if;

  select count(*) into v_final_count
  from jsonb_array_elements(p_stages) e
  where (e->>'is_final')::boolean is true;
  if v_final_count <> 1 then
    raise exception 'exactly one stage must be marked final (got %)', v_final_count;
  end if;

  -- Defer the (template_id, sort_order) unique check to commit so the
  -- renumber below can pass through intermediate collisions.
  set constraints public.workflow_stages_order_uniq deferred;

  for v_item in select * from jsonb_array_elements(p_stages)
  loop
    v_idx := v_idx + 1;
    v_id := nullif(v_item->>'id', '')::uuid;

    if v_id is not null and exists (
      select 1 from public.workflow_stages where id = v_id and template_id = p_template_id
    ) then
      update public.workflow_stages
      set name = v_item->>'name',
          color = coalesce(v_item->>'color', '#5A7BFF'),
          is_final = (v_item->>'is_final')::boolean,
          sort_order = v_idx,
          deleted_at = null
      where id = v_id;
    else
      insert into public.workflow_stages (template_id, name, color, is_final, sort_order)
      values (p_template_id, v_item->>'name', coalesce(v_item->>'color', '#5A7BFF'),
              (v_item->>'is_final')::boolean, v_idx)
      returning id into v_id;
    end if;

    v_keep_ids := v_keep_ids || v_id;
  end loop;

  update public.workflow_stages
  set deleted_at = now()
  where template_id = p_template_id
    and deleted_at is null
    and not (id = any(v_keep_ids));
end $$;

create or replace function public.soft_delete_workflow_template(p_template_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_blockers text;
begin
  if not public.is_admin() then
    raise exception 'only admins can delete workflows';
  end if;

  select string_agg(name, ', ') into v_blockers
  from public.order_types
  where workflow_template_id = p_template_id and deleted_at is null;

  if v_blockers is not null then
    raise exception 'cannot delete: still used by order type(s): %', v_blockers;
  end if;

  update public.workflow_templates set deleted_at = now() where id = p_template_id;
  update public.workflow_stages set deleted_at = now()
  where template_id = p_template_id and deleted_at is null;
end $$;

create or replace function public.soft_delete_order_type(p_order_type_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can delete order types';
  end if;
  update public.order_types set deleted_at = now() where id = p_order_type_id;
end $$;
