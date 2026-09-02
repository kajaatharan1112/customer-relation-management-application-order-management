import { Fragment, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { useRole } from '@/core/auth/auth.hooks'
import { useBill } from '@/features/bills/queries/useBills'
import {
  useSetBillStatus,
  useRecordPayment,
  useDeleteBill,
} from '@/features/bills/mutations/useBillMutations'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { useWorkflowTemplates } from '@/features/settings/queries/useWorkflowTemplates'
import { BillStatusControl } from '@/features/bills/components/BillStatusControl'
import { RecordPaymentModal } from '@/features/bills/components/RecordPaymentModal'
import { BillFormModal } from '@/features/bills/components/BillFormModal'
import { useBillHistory } from '@/features/tracking/queries/useBillHistory'
import { useAdvanceStage } from '@/features/tracking/mutations/useAdvanceStage'
import { StageStepper } from '@/features/tracking/components/StageStepper'
import { HistoryTimeline } from '@/features/tracking/components/HistoryTimeline'
import { useComments } from '@/features/comments/queries/useComments'
import { useAddComment } from '@/features/comments/mutations/useAddComment'
import { CommentThread } from '@/features/comments/components/CommentThread'
import { useAttachments } from '@/features/attachments/queries/useAttachments'
import {
  useUploadAttachment,
  useRemoveAttachment,
} from '@/features/attachments/mutations/useAttachmentMutations'
import { AttachmentList } from '@/features/attachments/components/AttachmentList'
import { attachmentRepository } from '@/features/attachments/data/attachment.repository'
import { useRealtimeBill } from '@/features/realtime/useRealtimeBill'

export default function BillDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { show } = useToast()
  const { isStaff } = useRole()

  useRealtimeBill(id)

  const { data: bill, isLoading } = useBill(id)
  const { data: customers } = useCustomers()
  const { data: orderTypes } = useOrderTypes()
  const { data: templates } = useWorkflowTemplates()
  const history = useBillHistory(id)
  const comments = useComments(id)
  const attachments = useAttachments(id)

  const setStatus = useSetBillStatus()
  const recordPayment = useRecordPayment()
  const del = useDeleteBill()
  const advance = useAdvanceStage()
  const addComment = useAddComment(id)
  const upload = useUploadAttachment(id)
  const removeAtt = useRemoveAttachment(id)

  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return <div className="p-8 text-sm text-[var(--color-neo-text-secondary)]">Loading…</div>
  }
  if (!bill) {
    return <div className="p-8 text-sm text-[var(--color-neo-text-secondary)]">Bill not found.</div>
  }

  const balance = bill.total - bill.paidAmount
  const otOptions = (orderTypes ?? [])
    .filter((o) => o.isActive)
    .map((o) => ({ id: o.id, name: o.name, fixedAmount: o.fixedAmount }))

  const stagesFor = (orderTypeId: string | null) => {
    if (!orderTypeId) return []
    const ot = (orderTypes ?? []).find((o) => o.id === orderTypeId)
    const tpl = (templates ?? []).find((t) => t.id === ot?.workflowTemplateId)
    return tpl?.stages ?? []
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <button
        type="button"
        onClick={() => navigate('/bills')}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-neo-text-secondary)]"
      >
        <ArrowLeft size={16} /> Bills
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">{bill.billNumber}</h1>
          <StatusBadge label={bill.statusLabel} />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>

      <Card className="space-y-1 p-4 text-sm">
        <p className="font-semibold text-[var(--color-neo-text-primary)]">{bill.customerName}</p>
        <p className="text-[var(--color-neo-text-secondary)]">
          {bill.customerEmail}
          {bill.customerPhone ? ` · ${bill.customerPhone}` : ''}
        </p>
        <p className="text-[var(--color-neo-text-secondary)]">
          Ordered {bill.orderDate} · Due {bill.deadline ?? '—'}
        </p>
        {bill.notes && <p className="text-[var(--color-neo-text-secondary)]">{bill.notes}</p>}
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-neo-text-secondary)]">
                <th className="pb-2">Detail</th>
                <th className="pb-2">Type</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t border-[var(--color-neo-secondary)]/15">
                    <td className="py-2">{r.detail}</td>
                    <td className="py-2 text-[var(--color-neo-text-secondary)]">
                      {r.orderTypeName ?? '—'}
                    </td>
                    <td className="py-2 text-right">{formatCurrency(r.amount)}</td>
                  </tr>
                  {r.orderTypeId && (
                    <tr>
                      <td colSpan={3} className="pb-3">
                        <StageStepper
                          stages={stagesFor(r.orderTypeId)}
                          currentStageId={r.currentStageId}
                          onPick={
                            isStaff
                              ? (stageId) => {
                                  const note = window.prompt('Note for this stage change (optional):') ?? null
                                  advance.mutate(
                                    { rowId: r.id, toStageId: stageId, note, billId: bill.id },
                                    {
                                      onError: (err) =>
                                        show({
                                          type: 'error',
                                          title: 'Could not advance stage',
                                          message: (err as Error).message,
                                        }),
                                    },
                                  )
                                }
                              : undefined
                          }
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
                  className={`text-right font-semibold ${
                    balance > 0 ? 'text-[var(--color-neo-danger)]' : ''
                  }`}
                >
                  {formatCurrency(balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <BillStatusControl
          currentKey={bill.statusKey}
          onChange={async (key) => {
            try {
              await setStatus.mutateAsync({ id: bill.id, statusKey: key })
            } catch (err) {
              show({ type: 'error', title: 'Could not change status', message: (err as Error).message })
            }
          }}
        />
        <Button variant="default" size="sm" onClick={() => setPaying(true)}>
          Record payment
        </Button>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">History</h2>
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
          canManage={isStaff}
          onUpload={(file) =>
            upload.mutate(file, {
              onError: (err) =>
                show({ type: 'error', title: 'Upload failed', message: (err as Error).message }),
            })
          }
          onRemove={(a) => removeAtt.mutate({ id: a.id, path: a.storagePath })}
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

      {editing && (
        <BillFormModal
          bill={bill}
          customers={customers ?? []}
          orderTypes={otOptions}
          onClose={() => setEditing(false)}
        />
      )}
      {paying && (
        <RecordPaymentModal
          balance={balance}
          onClose={() => setPaying(false)}
          onSubmit={async (amount) => {
            try {
              await recordPayment.mutateAsync({ id: bill.id, paidAmount: amount })
              show({ type: 'success', title: 'Payment recorded' })
            } catch (err) {
              show({ type: 'error', title: 'Could not record payment', message: (err as Error).message })
            } finally {
              setPaying(false)
            }
          }}
        />
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete bill?">
        <p className="text-sm text-[var(--color-neo-text-secondary)]">This deletes {bill.billNumber}.</p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await del.mutateAsync(bill.id)
              show({ type: 'success', title: 'Bill deleted' })
              navigate('/bills')
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
