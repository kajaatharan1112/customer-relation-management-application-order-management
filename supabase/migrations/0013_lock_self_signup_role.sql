-- Public self-signup (RegisterPage -> supabase.auth.signUp) previously let
-- the caller pick their own role: the trigger read `user_type` straight out
-- of raw_user_meta_data, which is client-supplied `options.data` — nothing
-- stopped a request built outside the UI from setting user_type:
-- 'admin_member' and being created as an admin.
--
-- Supabase Auth keeps two metadata blobs on auth.users: raw_user_meta_data
-- (settable by the user themselves, via signUp/updateUser) and
-- raw_app_meta_data (settable only through the service-role Admin API —
-- the public client can never write it). Privilege now comes only from
-- app_metadata, set by admin-create-user (already verified the caller is
-- an admin_member) after the invite is created. A self-signup never
-- touches app_metadata, so it always falls back to 'customer' here,
-- regardless of what it puts in its own user_metadata.

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type_key text := coalesce(new.raw_app_meta_data->>'user_type', 'customer');
  v_type_id uuid;
  v_created_by uuid := nullif(new.raw_app_meta_data->>'created_by','')::uuid;
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
