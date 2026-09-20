export interface PortalBillListVM {
  id: string
  billNumber: string
  statusKey: string
  statusLabel: string
  total: number
  paidAmount: number
  orderDate: string
  deadline: string | null
  trackedRows: number
  completedRows: number
}
