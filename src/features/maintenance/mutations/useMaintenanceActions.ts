import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceRepository } from '@/features/maintenance/data/maintenance.repository'
import { buildArchiveZip } from '@/features/maintenance/data/exportArchive'
import type { ExportToken, PurgeResult } from '@/features/maintenance/maintenance.types'

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Fetches every eligible bill, builds a ZIP of per-bill PDFs + raw attachments,
 * downloads it, then records an export token that unlocks Purge.
 */
export function useRunExport() {
  const qc = useQueryClient()
  return useMutation<ExportToken, Error, string>({
    mutationFn: async (before: string) => {
      const bills = await maintenanceRepository.loadArchiveBills(before)
      const zip = await buildArchiveZip(bills, {
        fetchAttachment: (path) => maintenanceRepository.downloadAttachment(path),
      })
      triggerDownload(zip, `onevo-archive-${before}.zip`)
      return maintenanceRepository.recordExport(before)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance-stats'] }),
  })
}

export function usePurge() {
  const qc = useQueryClient()
  return useMutation<PurgeResult, Error, { before: string; token: string }>({
    mutationFn: ({ before, token }) => maintenanceRepository.purge(before, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-stats'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
    },
  })
}
