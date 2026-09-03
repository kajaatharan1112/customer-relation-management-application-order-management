-- 0009_member_management.sql — admin/employee account management helpers.
-- Adds: active_admin_count(), set_member_status() with a last-admin guard.
-- Read/update of profiles is already covered by profiles_self_read /
-- profiles_self_update (0003); set_member_status is security-definer and does
-- its own is_admin() check, so no new RLS policy is needed.

create or replace function public.active_admin_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.profiles p
  join public.user_types t on t.id = p.user_type_id
  where t.key = 'admin_member'
    and p.status = 'active'
    and p.deleted_at is null
$$;

create or replace function public.set_member_status(p_profile_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_is_target_admin boolean;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change member status';
  end if;

  if p_status not in ('active', 'disabled') then
    raise exception 'status must be active or disabled';
  end if;

  select (t.key = 'admin_member') into v_is_target_admin
  from public.profiles p
  join public.user_types t on t.id = p.user_type_id
  where p.id = p_profile_id;

  if v_is_target_admin and p_status = 'disabled' and public.active_admin_count() <= 1 then
    raise exception 'Cannot disable the last active admin';
  end if;

  update public.profiles
     set status = p_status,
         deleted_at = case when p_status = 'disabled' then now() else null end,
         updated_at = now()
   where id = p_profile_id;
end;
$$;

revoke all on function public.active_admin_count() from public;
revoke all on function public.set_member_status(uuid, text) from public;
grant execute on function public.active_admin_count() to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;
