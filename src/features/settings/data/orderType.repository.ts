import { supabase } from '@/core/supabase/client'
import type { OrderTypeVM } from '@/features/settings/settings.types'

interface OrderTypeRow {
  id: string
  name: string
  workflow_template_id: string
  fixed_amount: number | null
  is_active: boolean
  workflow_templates: { name: string } | null
}

export const orderTypeRepository = {
  async list(): Promise<OrderTypeVM[]> {
    const { data, error } = await supabase
      .from('order_types')
      .select('id, name, workflow_template_id, fixed_amount, is_active, workflow_templates(name)')
      .is('deleted_at', null)
      .order('name')
    if (error) throw error
    return (data as unknown as OrderTypeRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      workflowTemplateId: r.workflow_template_id,
      workflowName: r.workflow_templates?.name ?? '—',
      fixedAmount: r.fixed_amount,
      isActive: r.is_active,
    }))
  },

  async upsert(input: {
    id?: string
    name: string
    workflowTemplateId: string
    fixedAmount: number | null
    isActive: boolean
  }): Promise<void> {
    const row = {
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      workflow_template_id: input.workflowTemplateId,
      fixed_amount: input.fixedAmount,
      is_active: input.isActive,
    }
    const { error } = await supabase.from('order_types').upsert(row)
    if (error) throw error
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_order_type', { p_order_type_id: id })
    if (error) throw error
  },
}
