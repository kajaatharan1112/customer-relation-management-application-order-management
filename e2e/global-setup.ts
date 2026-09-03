import { execFileSync } from 'node:child_process'

const SCOOP_SHIMS = 'C:\\Users\\User\\scoop\\shims'
const DB_CONTAINER = 'supabase_db_perss_desin'

/**
 * Runs once before the whole E2E suite:
 *  1. `supabase db reset` — clean schema + re-seed the 3 test logins.
 *  2. Seed one workflow ("Print Flow": Pending → Printing → Delivered) and one
 *     order type ("E2E Poster") so bill/tracking specs have something to tag.
 *
 * IDs are fixed so specs can rely on them.
 */
export const E2E = {
  workflowId: 'e2e0aaaa-0000-0000-0000-000000000001',
  orderTypeId: 'e2e0bbbb-0000-0000-0000-000000000001',
  orderTypeName: 'E2E Poster',
  customerId: '33333333-3333-3333-3333-333333333333', // Cathy Customer (from supabase/seed.sql)
  oldBillId: 'e2e0cccc-0000-0000-0000-000000000001', // a 2-year-old completed bill, eligible to purge
}

// Runs immediately after `supabase db reset`, so the DB is always clean here —
// no ON CONFLICT needed (and workflow_stages' deferrable unique constraint
// cannot be used for ON CONFLICT inference anyway).
const FIXTURE_SQL = `
\\set ON_ERROR_STOP on
insert into public.workflow_templates (id, name, is_active)
values ('${E2E.workflowId}', 'Print Flow', true);

insert into public.workflow_stages (template_id, name, sort_order, color, is_final) values
  ('${E2E.workflowId}', 'Pending',   1, '#7E8DA8', false),
  ('${E2E.workflowId}', 'Printing',  2, '#5A7BFF', false),
  ('${E2E.workflowId}', 'Delivered', 3, '#39C16C', true);

insert into public.order_types (id, name, workflow_template_id, fixed_amount, is_active)
values ('${E2E.orderTypeId}', '${E2E.orderTypeName}', '${E2E.workflowId}', 1200, true);

-- One old, completed bill so the Account maintenance spec has something eligible to purge.
insert into public.bills (id, bill_number, customer_id, bill_status_id, order_date)
values ('${E2E.oldBillId}', 'ARCHIVE-1', '${E2E.customerId}',
        (select id from public.bill_statuses where key = 'completed'),
        (current_date - interval '2 years')::date);
insert into public.bill_rows (bill_id, detail, amount)
values ('${E2E.oldBillId}', 'Old archived poster', 900);
`

function run(cmd: string, args: string[], opts: { input?: string } = {}) {
  return execFileSync(cmd, args, {
    stdio: opts.input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input: opts.input,
    env: { ...process.env, PATH: `${process.env.PATH};${SCOOP_SHIMS}` },
    shell: false,
  })
}

export default async function globalSetup() {
  // eslint-disable-next-line no-console
  console.log('[e2e] resetting local Supabase database…')
  run(`${SCOOP_SHIMS}\\supabase.exe`, ['db', 'reset'])

  // eslint-disable-next-line no-console
  console.log('[e2e] seeding workflow + order type fixture…')
  run('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-q'], {
    input: FIXTURE_SQL,
  })
}
