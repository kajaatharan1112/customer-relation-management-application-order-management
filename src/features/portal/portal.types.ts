export interface PortalBillListVM {
  id: string
  billNumber: string
  statusKey: string
  statusLabel: string
  total: number
  deadline: string | null
  trackedRows: number
  completedRows: number
}
