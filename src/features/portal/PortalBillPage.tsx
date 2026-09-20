import { Fragment } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useToast } from '@/shared/ui/Toast'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { usePortalBill } from '@/features/portal/queries/usePortalBills'
import { useWorkflowTemplates } from '@/features/settings/queries/useWorkflowTemplates'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { useBillHistory } from '@/features/tracking/queries/useBillHistory'
import { StageStepper } from '@/features/tracking/components/StageStepper'
import { HistoryTimeline } from '@/features/tracking/components/HistoryTimeline'
import { useComments } from '@/features/comments/queries/useComments'
import { useAddComment } from '@/features/comments/mutations/useAddComment'
import { CommentThread } from '@/features/comments/components/CommentThread'
import { useAttachments } from '@/features/attachments/queries/useAttachments'
import { AttachmentList } from '@/features/attachments/components/AttachmentList'
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'
import { useRealtimeBill } from '@/features/realtime/useRealtimeBill'

export default function PortalBillPage() {
  const { id = '' } = useParams()
  const { show } = useToast()
  useRealtimeBill(id)

  const { data: bill, isLoading } = usePortalBill(id)
  const { data: templates } = useWorkflowTemplates()
  const { data: orderTypes } = useOrderTypes()
  const history = useBillHistory(id)
  const comments = useComments(id)
  const addComment = useAddComment(id)
  const attachments = useAttachments(id)

  if (isLoading) {
    return <div className="p-8 text-sm text-[var(--color-neo-text-secondary)]">Loading…</div>
  }
  if (!bill) {
    return (
      <div className="p-8 text-sm text-[var(--color-neo-text-secondary)]">
        Bill not found.{' '}
        <Link className="text-[var(--color-neo-primary)]" to="/portal">
          Back to my bills
        </Link>
      </div>
    )
  }

  const stagesFor = (orderTypeId: string | null) => {
    if (!orderTypeId) return []
    const ot = (orderTypes ?? []).find((o) => o.id === orderTypeId)
    const tpl = (templates ?? []).find((t) => t.id === ot?.workflowTemplateId)
    return tpl?.stages ?? []
  }

  const balance = bill.total - bill.paidAmount

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <Link
        to="/portal"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-neo-text-secondary)]"
      >
        <ArrowLeft size={16} /> My bills
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">{bill.billNumber}</h1>
        <StatusBadge label={bill.statusLabel} />
      </div>
      <p className="text-sm text-[var(--color-neo-text-secondary)]">
        Ordered {bill.orderDate} · Due {bill.deadline ?? '—'}
      </p>

      <Card className="p-4">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {bill.rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-t border-[var(--color-neo-secondary)]/15">
                  <td className="py-2">{r.detail}</td>
                  <td className="py-2 text-[var(--color-neo-text-secondary)]">{r.orderTypeName ?? '—'}</td>
                  <td className="py-2 text-right">{formatCurrency(r.amount)}</td>
                </tr>
                {r.orderTypeId && (
                  <tr>
                    <td colSpan={3} className="pb-3">
                      <StageStepper
                        stages={stagesFor(r.orderTypeId)}
                        currentStageId={r.currentStageId ?? null}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-[var(--color-neo-secondary)]/25">
            <tr>
              <td className="pt-2 font-semibold" colSpan={2}>
                Total
              </td>
              <td className="pt-2 text-right font-semibold">{formatCurrency(bill.total)}</td>
            </tr>
            <tr>
              <td className="text-[var(--color-neo-text-secondary)]" colSpan={2}>
                Paid
              </td>
              <td className="text-right text-[var(--color-neo-text-secondary)]">
                {formatCurrency(bill.paidAmount)}
              </td>
            </tr>
            <tr>
              <td className="font-semibold" colSpan={2}>
                Balance
              </td>
              <td
                className={`text-right font-semibold ${balance > 0 ? 'text-[var(--color-neo-danger)]' : ''}`}
              >
                {formatCurrency(balance)}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Progress</h2>
        <HistoryTimeline entries={history.data ?? []} />
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Messages</h2>
        <CommentThread
          comments={comments.data ?? []}
          posting={addComment.isPending}
          onPost={async (body) => {
            try {
              await addComment.mutateAsync(body)
            } catch (err) {
              show({ type: 'error', title: 'Could not send', message: (err as Error).message })
            }
          }}
        />
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">Files</h2>
        <AttachmentList
          attachments={attachments.data ?? []}
          canManage={false}
          onUpload={() => {}}
          onRemove={() => {}}
          onDownload={async (a) => {
            try {
              const url = await attachmentRepository.signedUrl(a.storagePath)
              window.open(url, '_blank', 'noopener')
            } catch (err) {
              show({ type: 'error', title: 'Could not open file', message: (err as Error).message })
            }
          }}
        />
      </Card>
    </div>
  )
}
