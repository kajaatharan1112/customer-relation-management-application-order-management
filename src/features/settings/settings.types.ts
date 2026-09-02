export interface WorkflowStageVM {
  id: string
  name: string
  sortOrder: number
  color: string
  isFinal: boolean
}

export interface WorkflowTemplateVM {
  id: string
  name: string
  description: string | null
  isActive: boolean
  stages: WorkflowStageVM[]
}

export interface EditableStage {
  id?: string
  name: string
  color: string
  isFinal: boolean
}

export interface OrderTypeVM {
  id: string
  name: string
  workflowTemplateId: string
  workflowName: string
  fixedAmount: number | null
  isActive: boolean
}
