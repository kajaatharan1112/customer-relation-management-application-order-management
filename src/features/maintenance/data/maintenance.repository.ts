import { supabase } from '@/core/supabase/client'
import type {
  ExportToken,
  MaintenanceStatsVM,
  PurgeResult,
  PurgeStats,
} from '@/features/maintenance/maintenance.types'
import type { ArchiveBill } from '@/features/maintenance/data/exportArchive'

const ATTACHMENTS_BUCKET = 'attachments'

interface ArchiveRow {
  id: string
  bill_number: string
  order_date: string
  paid_amount: number
  profiles: { full_name: string } | null
  bill_statuses: { is_terminal: boolean } | null
  bill_rows: {
    id: string
    detail: string
    amount: number
    order_types: { name: string } | null
    order_status_history: { created_at: string; note: string | null; to_stage: { name: string } | null }[]
  }[]
  bill_comments: { body: string; created_at: string; author: { full_name: string } | null }[]
}

function toStats(raw: unknown): PurgeStats {
  const o = (raw ?? {}) as Record<string, unknown>
  return {
    bills: Number(o.bills ?? 0),
    billRows: Number(o.billRows ?? 0),
    comments: Number(o.comments ?? 0),
    attachments: Number(o.attachments ?? 0),
    storageBytes: Number(o.storageBytes ?? 0),
  }
}

export const maintenanceRepository = {
  async stats(before: string): Promise<MaintenanceStatsVM> {
    const { data, error } = await supabase.rpc('maintenance_stats', { p_before: before })
    if (error) throw error
    const d = (data ?? {}) as { total?: unknown; eligible?: unknown }
    return { total: toStats(d.total), eligible: toStats(d.eligible), cutoff: before }
  },

  /** Fetch the full content of every eligible (done + older than `before`) bill, for the PDF export. */
  async loadArchiveBills(before: string): Promise<ArchiveBill[]> {
    const { data, error } = await supabase
      .from('bills')
      .select(
        'id, bill_number, order_date, paid_amount, profiles!customer_id(full_name), bill_statuses!inner(is_terminal), bill_rows(id, detail, amount, order_types(name), order_status_history(created_at, note, to_stage:workflow_stages!to_stage_id(name))), bill_comments(body, created_at, author:profiles!author_id(full_name))',
      )
      .eq('bill_statuses.is_terminal', true)
      .lt('order_date', before)
      .order('order_date')
    if (error) throw error
    const rows = (data as unknown as ArchiveRow[]).filter((r) => r.bill_statuses?.is_terminal)

    const billIds = rows.map((r) => r.id)
    const rowIds = rows.flatMap((r) => r.bill_rows.map((br) => br.id))
    const { data: atts, error: aErr } = await supabase
      .from('attachments')
      .select('file_name, storage_path, owner_type, owner_id')
      .or(`owner_id.in.(${[...billIds, ...rowIds].join(',')})`)
    if (aErr) throw aErr
    const attByBill = new Map<string, { filename: string; storagePath: string }[]>()
    for (const a of (atts ?? []) as { file_name: string; storage_path: string; owner_type: string; owner_id: string }[]) {
      const owningBill =
        a.owner_type === 'bill'
          ? a.owner_id
          : rows.find((r) => r.bill_rows.some((br) => br.id === a.owner_id))?.id
      if (!owningBill) continue
      const list = attByBill.get(owningBill) ?? []
      list.push({ filename: a.file_name, storagePath: a.storage_path })
      attByBill.set(owningBill, list)
    }

    return rows.map((r) => ({
      billNumber: r.bill_number,
      customerName: r.profiles?.full_name ?? '',
      orderDate: r.order_date,
      total: r.bill_rows.reduce((s, br) => s + Number(br.amount), 0),
      paidAmount: Number(r.paid_amount),
      rows: r.bill_rows.map((br) => ({
        detail: br.detail,
        amount: Number(br.amount),
        orderTypeName: br.order_types?.name ?? null,
      })),
      history: r.bill_rows
        .flatMap((br) => br.order_status_history)
        .sort((x, y) => (x.created_at < y.created_at ? -1 : 1))
        .map((hst) => ({ stage: hst.to_stage?.name ?? '', at: hst.created_at, note: hst.note })),
      comments: r.bill_comments
        .sort((x, y) => (x.created_at < y.created_at ? -1 : 1))
        .map((c) => ({ author: c.author?.full_name ?? '', body: c.body, at: c.created_at })),
      attachments: attByBill.get(r.id) ?? [],
    }))
  },

  async downloadAttachment(storagePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).download(storagePath)
    if (error) throw error
    return data
  },

  async recordExport(coversBefore: string): Promise<ExportToken> {
    const { data, error } = await supabase
      .from('export_tokens')
      .insert({ covers_before: coversBefore })
      .select('id, covers_before, created_at')
      .single()
    if (error) throw error
    const row = data as { id: string; covers_before: string; created_at: string }
    return { token: row.id, coversBefore: row.covers_before, createdAt: row.created_at }
  },

  async purge(before: string, token: string): Promise<PurgeResult> {
    const { data, error } = await supabase.rpc('purge_archived_data', {
      p_before: before,
      p_token: token,
    })
    if (error) throw error
    const d = (data ?? {}) as { counts?: unknown; storage_paths?: unknown }
    const paths = Array.isArray(d.storage_paths) ? (d.storage_paths as string[]) : []
    if (paths.length > 0) {
      const { error: rmErr } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths)
      if (rmErr) throw rmErr
    }
    return { counts: toStats(d.counts), storagePathsRemoved: paths.length }
  },
}
