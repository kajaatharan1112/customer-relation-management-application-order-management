export interface HistoryEntryVM {
  id: string
  rowDetail: string
  fromStage: string | null
  toStage: string
  note: string | null
  changedByName: string | null
  createdAt: string
}
