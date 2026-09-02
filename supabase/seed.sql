-- LOCAL DEV ONLY. Runs on `supabase db reset`; NOT applied by `supabase db push`.
-- Three test accounts. Password for all: password123
--   admin@onevo.test     -> admin_member
--   staff@onevo.test     -> employee
--   customer@onevo.test  -> customer

do $$
declare
  v_admin uuid := '11111111-1111-1111-1111-111111111111';
  v_staff uuid := '22222222-2222-2222-2222-222222222222';
  v_cust  uuid := '33333333-3333-3333-3333-333333333333';
  r record;
begin
  for r in
    select * from (values
      (v_admin, 'admin@onevo.test',    'admin_member', 'Ava Admin'),
      (v_staff, 'staff@onevo.test',    'employee',     'Sam Staff'),
      (v_cust,  'customer@onevo.test', 'customer',     'Cathy Customer')
    ) as t(id, email, user_type, full_name)
  loop
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
      r.id, 'authenticated', 'authenticated', r.email,
      crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('user_type', r.user_type, 'full_name', r.full_name),
      now(), now(),
      '', '', '', '', '', '', '', ''
    )
    on conflict (id) do nothing;

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      r.id::text, r.id,
      jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true),
      'email', now(), now(), now()
    )
    on conflict (provider, provider_id) do nothing;
  end loop;
end $$;
