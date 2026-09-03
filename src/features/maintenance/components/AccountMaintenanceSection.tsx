import { useMemo, useState } from 'react'
import { DatabaseZap, Download, Trash2, HardDrive } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/features/auth/authShared'
import { useToast } from '@/shared/ui/Toast'
import { formatBytes } from '@/shared/utils/formatBytes'
import { defaultCutoff, clampCutoff } from '@/features/maintenance/maintenance.retention'
import { useMaintenanceStats } from '@/features/maintenance/queries/useMaintenanceStats'
import { useRunExport, usePurge } from '@/features/maintenance/mutations/useMaintenanceActions'
import { PurgeConfirmModal } from '@/features/maintenance/components/PurgeConfirmModal'
import type { ExportToken, PurgeStats } from '@/features/maintenance/maintenance.types'

function StatRow({ stats }: { stats: PurgeStats }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <span><b className="text-[var(--color-neo-text-primary)]">{stats.bills}</b> <span className="text-[var(--color-neo-text-secondary)]">bills</span></span>
      <span><b className="text-[var(--color-neo-text-primary)]">{stats.billRows}</b> <span className="text-[var(--color-neo-text-secondary)]">line items</span></span>
      <span><b className="text-[var(--color-neo-text-primary)]">{stats.comments}</b> <span className="text-[var(--color-neo-text-secondary)]">comments</span></span>
      <span><b className="text-[var(--color-neo-text-primary)]">{stats.attachments}</b> <span className="text-[var(--color-neo-text-secondary)]">files</span></span>
      <span className="flex items-center gap-1 text-[var(--color-neo-text-secondary)]">
        <HardDrive size={13} />{formatBytes(stats.storageBytes)}
      </span>
    </div>
  )
}

export function AccountMaintenanceSection() {
  const [cutoff, setCutoff] = useState(() => defaultCutoff())
  const [token, setToken] = useState<ExportToken | null>(null)
  const [showPurge, setShowPurge] = useState(false)
  const { show } = useToast()

  const stats = useMaintenanceStats(cutoff)
  const runExport = useRunExport()
  const purge = usePurge()

  const canPurge = useMemo(
    () => !!token && token.coversBefore >= cutoff && (stats.data?.eligible.bills ?? 0) > 0,
    [token, cutoff, stats.data],
  )

  const onCutoff = (v: string) => {
    setCutoff(clampCutoff(v))
    setToken(null) // a new cut-off invalidates the previous export
  }

  const onExport = async () => {
    try {
      const t = await runExport.mutateAsync(cutoff)
      setToken(t)
      show({ type: 'success', title: 'Export downloaded', message: 'You can now purge the exported data.' })
    } catch (err) {
      show({ type: 'error', title: 'Export failed', message: (err as Error).message })
    }
  }

  const onConfirmPurge = async () => {
    if (!token) return
    try {
      const r = await purge.mutateAsync({ before: cutoff, token: token.token })
      show({ type: 'success', title: `Purged ${r.counts.bills} bill(s)` })
      setToken(null)
    } catch (err) {
      show({ type: 'error', title: 'Purge failed', message: (err as Error).message })
    } finally {
      setShowPurge(false)
    }
  }

  if (stats.isLoading) {
    return <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
  }
  if (stats.isError || !stats.data) {
    return <p className="text-sm text-[var(--color-neo-danger)]">Could not load maintenance stats.</p>
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[var(--color-neo-text-primary)]">
          <DatabaseZap size={16} />Storage in use
        </h2>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Everything</p>
          <StatRow stats={stats.data.total} />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
            Eligible to purge (done, before the cut-off)
          </p>
          <StatRow stats={stats.data.eligible} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-[15px] font-bold text-[var(--color-neo-text-primary)]">Cut-off date</h2>
        <p className="mb-3 text-[11px] text-[var(--color-neo-text-secondary)]">
          Only completed/paid bills ordered before this date are exported and purged. It cannot be
          less than 18 months ago.
        </p>
        <div className="sm:w-56">
          <Field id="cutoff" label="" type="date" value={cutoff} onChange={(e) => onCutoff(e.target.value)} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-[15px] font-bold text-[var(--color-neo-text-primary)]">Export, then purge</h2>
        <p className="mb-4 text-[11px] text-[var(--color-neo-text-secondary)]">
          Download a ZIP of PDFs (one per bill, with its attachments) first. Purge unlocks only
          after a successful export.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="default"
            icon={<Download size={16} />}
            disabled={runExport.isPending || stats.data.eligible.bills === 0}
            onClick={onExport}
          >
            {runExport.isPending ? 'Building…' : 'Export eligible data'}
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            disabled={!canPurge || purge.isPending}
            onClick={() => setShowPurge(true)}
          >
            {purge.isPending ? 'Purging…' : 'Purge exported data'}
          </Button>
        </div>
      </Card>

      {showPurge && (
        <PurgeConfirmModal
          counts={stats.data.eligible}
          onCancel={() => setShowPurge(false)}
          onConfirm={onConfirmPurge}
        />
      )}
    </div>
  )
}
