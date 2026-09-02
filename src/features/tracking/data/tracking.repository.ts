import { supabase } from '@/core/supabase/client'
import type { HistoryEntryVM } from '@/features/tracking/tracking.types'

interface HistoryRow {
  id: string
  row_detail: string
  from_stage: string | null
  to_stage: string
  note: string | null
  changed_by_name: string | null
  created_at: string
}

export const trackingRepository = {
  async advanceStage(rowId: string, toStageId: string, note: string | null): Promise<void> {
    const { error } = await supabase.rpc('advance_bill_row_stage', {
      p_row_id: rowId,
      p_to_stage_id: toStageId,
      p_note: note ?? undefined,
    })
    if (error) throw error
  },

  async listHistory(billId: string): Promise<HistoryEntryVM[]> {
    const { data, error } = await supabase
      .from('bill_history')
      .select('*')
      .eq('bill_id', billId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as HistoryRow[]).map((r) => ({
      id: r.id,
      rowDetail: r.row_detail,
      fromStage: r.from_stage,
      toStage: r.to_stage,
      note: r.note,
      changedByName: r.changed_by_name,
      createdAt: r.created_at,
    }))
  },
}
