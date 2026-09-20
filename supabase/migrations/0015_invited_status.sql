-- The `status` column (0001) already has an 'invited' value, but nothing has
-- ever set it: every new profile defaulted straight to 'active', so an
-- admin-invited customer/employee looked exactly like a fully confirmed one
-- from the moment "Send OTP" was clicked, before they ever verified.
--
-- admin-create-user stamps `invited_by_admin: true` into the invite's own
-- user_metadata (the `data` passed to inviteUserByEmail) specifically so this
-- trigger can see it. auth.users.invited_at itself is NOT usable here: GoTrue
-- sets it in a step after the row insert that fires this trigger, so it's
-- still null at this point even though the final row does end up with it.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type_key text := coalesce(new.raw_app_meta_data->>'user_type', 'customer');
  v_type_id uuid;
  v_created_by uuid := nullif(new.raw_app_meta_data->>'created_by','')::uuid;
  v_invited boolean := coalesce((new.raw_user_meta_data->>'invited_by_admin')::boolean, false);
  v_status text := case when v_invited then 'invited' else 'active' end;
begin
  select id into v_type_id from public.user_types where key = v_type_key;
  if v_type_id is null then
    select id into v_type_id from public.user_types where key = 'customer';
    v_type_key := 'customer';
  end if;

  insert into public.profiles (id, user_type_id, full_name, email, created_by, status)
  values (
    new.id,
    v_type_id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    v_created_by,
    v_status
  );

  if v_type_key = 'customer' then
    insert into public.customers (profile_id, created_by) values (new.id, v_created_by);
  end if;

  return new;
end $$;
