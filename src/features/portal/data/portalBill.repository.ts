import { supabase } from '@/core/supabase/client'
import { billRepository } from '@/features/bills/data/bill.repository'
import type { BillDetailVM } from '@/features/bills/bills.types'
import type { PortalBillListVM } from '@/features/portal/portal.types'

interface PortalRow {
  id: string
  bill_number: string
  deadline: string | null
  bill_statuses: { key: string; label: string } | null
  bill_rows: {
    amount: number
    deleted_at: string | null
    order_type_id: string | null
    workflow_stages: { is_final: boolean } | null
  }[]
}

export const portalBillRepository = {
  // The stage progress hint mirrors the `bill_stage_summary` view's semantics
  // (tracked = rows with an order type, completed = rows in a final stage) but
  // computes it from the embedded rows: PostgREST cannot resolve a relationship
  // between `bills` and that aggregate view, so it is not embeddable.
  async list(): Promise<PortalBillListVM[]> {
    const { data, error } = await supabase
      .from('bills')
      .select(
        'id, bill_number, deadline, bill_statuses(key, label), bill_rows(amount, deleted_at, order_type_id, workflow_stages(is_final))',
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as PortalRow[]).map((b) => {
      const live = b.bill_rows.filter((r) => r.deleted_at === null)
      return {
        id: b.id,
        billNumber: b.bill_number,
        statusKey: b.bill_statuses?.key ?? 'pending',
        statusLabel: b.bill_statuses?.label ?? 'Pending',
        total: live.reduce((s, r) => s + Number(r.amount), 0),
        deadline: b.deadline,
        trackedRows: live.filter((r) => r.order_type_id !== null).length,
        completedRows: live.filter((r) => r.workflow_stages?.is_final === true).length,
      }
    })
  },

  async get(id: string): Promise<BillDetailVM | null> {
    const bill = await billRepository.get(id)
    if (!bill) return null
    const { data: userData } = await supabase.auth.getUser()
    return bill.customerId === userData.user?.id ? bill : null
  },
}
