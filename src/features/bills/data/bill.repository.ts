import { supabase } from '@/core/supabase/client'
import type {
  BillListItemVM,
  BillDetailVM,
  BillRowVM,
  BillRowDraft,
} from '@/features/bills/bills.types'

interface RowRow {
  id: string
  detail: string
  order_type_id: string | null
  amount: number
  deleted_at: string | null
  current_stage_id: string | null
  order_types: { name: string } | null
}
interface BillRow {
  id: string
  bill_number: string
  customer_id: string
  order_date: string
  deadline: string | null
  paid_amount: number
  notes?: string | null
  profiles: { full_name: string; email: string; phone: string | null } | null
  bill_statuses: { key: string; label: string } | null
  bill_rows: RowRow[]
}

const SELECT =
  'id, bill_number, customer_id, order_date, deadline, paid_amount, notes, profiles!customer_id(full_name, email, phone), bill_statuses(key, label), bill_rows(id, detail, order_type_id, amount, deleted_at, current_stage_id, order_types(name))'

function liveRows(rows: RowRow[]): BillRowVM[] {
  return rows
    .filter((r) => r.deleted_at === null)
    .map((r) => ({
      id: r.id,
      detail: r.detail,
      orderTypeId: r.order_type_id,
      orderTypeName: r.order_types?.name ?? null,
      amount: Number(r.amount),
      currentStageId: r.current_stage_id,
    }))
}

function toListItem(b: BillRow): BillListItemVM {
  const rows = liveRows(b.bill_rows)
  return {
    id: b.id,
    billNumber: b.bill_number,
    customerId: b.customer_id,
    customerName: b.profiles?.full_name ?? '',
    statusKey: b.bill_statuses?.key ?? 'pending',
    statusLabel: b.bill_statuses?.label ?? 'Pending',
    total: rows.reduce((s, r) => s + r.amount, 0),
    paidAmount: Number(b.paid_amount),
    orderDate: b.order_date,
    deadline: b.deadline,
  }
}

export const billRepository = {
  async list(): Promise<BillListItemVM[]> {
    const { data, error } = await supabase
      .from('bills')
      .select(SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as BillRow[]).map(toListItem)
  },

  async get(id: string): Promise<BillDetailVM | null> {
    const { data, error } = await supabase
      .from('bills')
      .select(SELECT)
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error) return null
    const b = data as unknown as BillRow
    return {
      ...toListItem(b),
      customerEmail: b.profiles?.email ?? '',
      customerPhone: b.profiles?.phone ?? null,
      notes: b.notes ?? null,
      rows: liveRows(b.bill_rows),
    }
  },

  async save(
    bill: {
      id?: string
      customerId: string
      orderDate: string
      deadline: string | null
      notes: string | null
    },
    rows: BillRowDraft[],
  ): Promise<string> {
    const p_bill = {
      id: bill.id,
      customer_id: bill.customerId,
      order_date: bill.orderDate,
      deadline: bill.deadline,
      notes: bill.notes,
    }
    const p_rows = rows.map((r) => ({
      id: r.id,
      detail: r.detail,
      order_type_id: r.orderTypeId,
      amount: r.amount,
    }))
    const { data, error } = await supabase.rpc('save_bill', { p_bill, p_rows })
    if (error) throw error
    return data as string
  },

  async setStatus(id: string, statusKey: string): Promise<void> {
    const { error } = await supabase.rpc('set_bill_status', {
      p_bill_id: id,
      p_status_key: statusKey,
    })
    if (error) throw error
  },

  async recordPayment(id: string, paidAmount: number): Promise<void> {
    const { error } = await supabase.from('bills').update({ paid_amount: paidAmount }).eq('id', id)
    if (error) throw error
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_bill', { p_bill_id: id })
    if (error) throw error
  },
}
