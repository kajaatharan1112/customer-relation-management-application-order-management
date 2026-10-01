// Bootstraps the first admin_member account through the GoTrue Admin API —
// not a migration, because direct SQL inserts into auth.users/auth.identities
// are unsupported by Supabase (schema drifts between platform versions) and
// go through pgcrypto's crypt()/gen_salt() instead of GoTrue's own password
// hashing. This works identically against local and cloud; only the env vars
// change. Safe to re-run: skips if the email already exists.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ADMIN_EMAIL=... ADMIN_PASSWORD=... \
//     node supabase/scripts/seed-admin.mjs
//
// Never commit real SUPABASE_SERVICE_ROLE_KEY or ADMIN_PASSWORD values —
// pass them as env vars on the command line or from your shell's secret store.

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const fullName = process.env.ADMIN_FULL_NAME ?? 'Admin'

for (const [name, value] of Object.entries({
  SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
})) {
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
}

const admin = createClient(url, serviceKey)

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  // GoTrue inserts auth.users with just provider/providers in app_metadata
  // and merges this in with a separate UPDATE afterwards — same quirk as
  // the invite flow in admin-create-user/index.ts. handle_new_auth_user
  // (AFTER INSERT trigger) therefore always sees user_type missing here and
  // creates the profile as 'customer' (plus a customers row) regardless.
  // Fixed up below, the same way admin-create-user does it.
  app_metadata: { user_type: 'admin_member' },
  user_metadata: { full_name: fullName },
})

if (error) {
  if (/already (been )?registered|already exists|email_exists/i.test(error.message)) {
    console.log(`Admin account ${email} already exists — skipping.`)
    process.exit(0)
  }
  console.error('Failed to create admin account:', error.message)
  process.exit(1)
}

const userId = data.user.id

const { data: typeRow, error: typeErr } = await admin
  .from('user_types')
  .select('id')
  .eq('key', 'admin_member')
  .single()
if (typeErr || !typeRow) {
  console.error('Could not look up admin_member user type:', typeErr?.message ?? 'not found')
  process.exit(1)
}

const { error: fixTypeErr } = await admin
  .from('profiles')
  .update({ user_type_id: typeRow.id })
  .eq('id', userId)
if (fixTypeErr) {
  console.error('Created the auth user but failed to set its profile role:', fixTypeErr.message)
  process.exit(1)
}

const { error: dropCustomerErr } = await admin.from('customers').delete().eq('profile_id', userId)
if (dropCustomerErr) {
  console.error('Created the admin profile but failed to drop its stray customers row:', dropCustomerErr.message)
  process.exit(1)
}

console.log(`Created admin account ${email} (user id: ${userId})`)
