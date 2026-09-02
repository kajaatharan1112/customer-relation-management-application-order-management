export interface BillRowVM {
  id: string
  detail: string
  orderTypeId: string | null
  orderTypeName: string | null
  amount: number
  currentStageId: string | null
}

export interface BillListItemVM {
  id: string
  billNumber: string
  customerId: string
  customerName: string
  statusKey: string
  statusLabel: string
  total: number
  paidAmount: number
  orderDate: string
  deadline: string | null
}

export interface BillDetailVM extends BillListItemVM {
  customerEmail: string
  customerPhone: string | null
  notes: string | null
  rows: BillRowVM[]
}

export interface BillRowDraft {
  id?: string
  detail: string
  orderTypeId: string | null
  amount: number
}
