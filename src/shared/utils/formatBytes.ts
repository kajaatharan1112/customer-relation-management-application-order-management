export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Number(kb.toFixed(kb < 10 ? 1 : 0))} KB`
  const mb = kb / 1024
  return `${Number(mb.toFixed(mb < 10 ? 1 : 0))} MB`
}
