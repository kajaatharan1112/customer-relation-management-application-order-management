import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'

/**
 * Subscribes to changes on a single bill and its related rows, so open
 * bill-detail pages (staff and portal) refresh without a manual reload.
 * Realtime still honours RLS — a client only receives rows it can see.
 */
export function useRealtimeBill(billId: string): void {
  const qc = useQueryClient()

  useEffect(() => {
    if (!billId) return

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['bills', billId] })
      qc.invalidateQueries({ queryKey: ['bill-history', billId] })
      qc.invalidateQueries({ queryKey: ['bill-comments', billId] })
      qc.invalidateQueries({ queryKey: ['bill-attachments', billId] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['portal-bills'] })
      qc.invalidateQueries({ queryKey: ['portal-bill', billId] })
    }

    const channel = supabase
      .channel(`bill-${billId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills', filter: `id=eq.${billId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bill_rows', filter: `bill_id=eq.${billId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_status_history' },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bill_comments', filter: `bill_id=eq.${billId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attachments', filter: `owner_id=eq.${billId}` },
        invalidate,
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [billId, qc])
}
