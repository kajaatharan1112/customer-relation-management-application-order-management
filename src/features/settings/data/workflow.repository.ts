import { supabase } from '@/core/supabase/client'
import type { WorkflowTemplateVM, WorkflowStageVM } from '@/features/settings/settings.types'

interface StageRow {
  id: string
  name: string
  sort_order: number
  color: string
  is_final: boolean
  deleted_at: string | null
}

interface TemplateRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  workflow_stages: StageRow[]
}

function mapTemplate(row: TemplateRow): WorkflowTemplateVM {
  const stages: WorkflowStageVM[] = row.workflow_stages
    .filter((s) => s.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ id: s.id, name: s.name, sortOrder: s.sort_order, color: s.color, isFinal: s.is_final }))
  return { id: row.id, name: row.name, description: row.description, isActive: row.is_active, stages }
}

export const workflowRepository = {
  async list(): Promise<WorkflowTemplateVM[]> {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select(
        'id, name, description, is_active, workflow_stages(id, name, sort_order, color, is_final, deleted_at)',
      )
      .is('deleted_at', null)
      .order('name')
    if (error) throw error
    return (data as unknown as TemplateRow[]).map(mapTemplate)
  },

  async upsertTemplate(input: {
    id?: string
    name: string
    description: string | null
    isActive: boolean
  }): Promise<string> {
    const { data, error } = await supabase
      .from('workflow_templates')
      .upsert(
        input.id
          ? { id: input.id, name: input.name, description: input.description, is_active: input.isActive }
          : { name: input.name, description: input.description, is_active: input.isActive },
      )
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: string }).id
  },

  async saveStages(
    templateId: string,
    stages: { id?: string; name: string; color: string; isFinal: boolean }[],
  ): Promise<void> {
    const payload = stages.map((s) => ({ id: s.id, name: s.name, color: s.color, is_final: s.isFinal }))
    const { error } = await supabase.rpc('replace_workflow_stages', {
      p_template_id: templateId,
      p_stages: payload,
    })
    if (error) throw error
  },

  async softDeleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_workflow_template', { p_template_id: id })
    if (error) throw error
  },
}
