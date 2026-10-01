-- Seed a real admin account (runs via db push too, unlike supabase/seed.sql
-- which is local-dev-only). Idempotent: skipped if the email already exists.

do $$
declare
  v_admin uuid := '44444444-4444-4444-4444-444444444444';
begin
  if exists (select 1 from auth.users where email = 'kajaatharan1112@gmail.com') then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current, email_change,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_admin, 'authenticated', 'authenticated', 'kajaatharan1112@gmail.com',
    crypt('password123', gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', array['email'], 'user_type', 'admin_member'),
    jsonb_build_object('full_name', 'Admin'),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    v_admin::text, v_admin,
    jsonb_build_object('sub', v_admin::text, 'email', 'kajaatharan1112@gmail.com', 'email_verified', true),
    'email', now(), now(), now()
  );
end $$;
