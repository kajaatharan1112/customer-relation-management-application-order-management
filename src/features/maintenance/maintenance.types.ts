export interface PurgeStats {
  bills: number
  billRows: number
  comments: number
  attachments: number
  storageBytes: number
}

export interface MaintenanceStatsVM {
  total: PurgeStats
  eligible: PurgeStats
  cutoff: string // YYYY-MM-DD
}

export interface ExportToken {
  token: string
  coversBefore: string // YYYY-MM-DD
  createdAt: string
}

export interface PurgeResult {
  counts: PurgeStats
  storagePathsRemoved: number
}
