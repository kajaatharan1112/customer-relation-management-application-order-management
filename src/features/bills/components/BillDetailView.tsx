import { Fragment, useState } from 'react'
import {
  X,
  Mail,
  Phone,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  Wallet,
  History,
  MessageSquare,
  Paperclip,
} from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { bucketOf, BUCKET_COLOR } from '@/shared/constants/billStatus'
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

export function BillDetailView({ billId, onClose }: { billId: string; onClose: () => void }) {
  const { show } = useToast()
  const { isStaff } = useRole()

  useRealtimeBill(billId)

  const { data: bill, isLoading } = useBill(billId)
  const { data: customers } = useCustomers()
  const { data: orderTypes } = useOrderTypes()
  const { data: templates } = useWorkflowTemplates()
  const history = useBillHistory(billId)
  const comments = useComments(billId)
  const attachments = useAttachments(billId)

  const setStatus = useSetBillStatus()
  const recordPayment = useRecordPayment()
  const del = useDeleteBill()
  const advance = useAdvanceStage()
  const addComment = useAddComment(billId)
  const upload = useUploadAttachment(billId)
  const removeAtt = useRemoveAttachment(billId)

  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return <div className="p-2 text-sm text-[var(--color-neo-text-secondary)]">Loading…</div>
  }
  if (!bill) {
    return <div className="p-2 text-sm text-[var(--color-neo-text-secondary)]">Bill not found.</div>
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">
            {bill.billNumber}
          </h1>
          <StatusBadge label={bill.statusLabel} color={BUCKET_COLOR[bucketOf(bill.statusKey)]} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaying(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-neo-primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-neo-primary)] transition active:scale-95"
          >
            <Wallet size={15} />Record payment
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-neo-warning)]/15 px-3 py-2 text-xs font-semibold text-[#a9750b] transition active:scale-95"
          >
            <Pencil size={15} />Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-neo-danger)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-neo-danger)] transition active:scale-95"
          >
            <Trash2 size={15} />Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-neo-text-secondary)] shadow-[var(--shadow-neo-pressed)] transition active:scale-95"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] p-4">
        <p className="text-sm font-semibold text-[var(--color-neo-text-primary)]">{bill.customerName}</p>
        <div className="mt-2 flex flex-col gap-2">
          <span className="flex items-center gap-2.5 text-[13px] text-[var(--color-neo-text-secondary)]">
            <Mail size={15} className="shrink-0" />
            {bill.customerEmail}
          </span>
          <span className="flex items-center gap-2.5 text-[13px] text-[var(--color-neo-text-secondary)]">
            <Phone size={15} className="shrink-0" />
            {bill.customerPhone ?? '—'}
          </span>
          <span className="flex items-center gap-2.5 text-[13px] text-[var(--color-neo-text-secondary)]">
            <Calendar size={15} className="shrink-0" />
            Ordered {bill.orderDate}
          </span>
          <span className="flex items-center gap-2.5 text-[13px] text-[var(--color-neo-text-secondary)]">
            <Clock size={15} className="shrink-0" />
            Due {bill.deadline ?? '—'}
          </span>
        </div>
        {bill.notes && (
          <p className="mt-2 text-[13px] text-[var(--color-neo-text-secondary)]/70">{bill.notes}</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] p-4">
        <h2 className="text-[15px] font-bold text-[var(--color-neo-text-primary)]">Line items</h2>
        <div className="mt-3 overflow-x-auto">
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
          </table>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div
            data-testid="bill-total"
            className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
              Total
            </span>
            <span className="text-sm font-semibold text-[var(--color-neo-text-primary)]">
              {formatCurrency(bill.total)}
            </span>
          </div>
          <div
            data-testid="bill-paid"
            className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
              Paid
            </span>
            <span className="text-sm font-semibold text-[var(--color-neo-text-primary)]">
              {formatCurrency(bill.paidAmount)}
            </span>
          </div>
          <div
            data-testid="bill-balance"
            className="flex flex-col gap-0.5 rounded-xl bg-[var(--color-neo-surface)] px-3 py-2 shadow-[var(--shadow-neo-pressed)]"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
              Balance
            </span>
            <span
              className={`text-sm font-semibold ${
                balance > 0
                  ? 'text-[var(--color-neo-danger)]'
                  : 'text-[var(--color-neo-text-primary)]'
              }`}
            >
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] p-4">
        <h2 className="text-[15px] font-bold text-[var(--color-neo-text-primary)]">Actions</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
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
        </div>
      </div>

      <div className="rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[var(--color-neo-text-primary)]">
          <History size={16} />History
        </h2>
        <HistoryTimeline entries={history.data ?? []} />
      </div>

      <div className="rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[var(--color-neo-text-primary)]">
          <MessageSquare size={16} />Messages
        </h2>
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
      </div>

      <div className="rounded-2xl border border-white/50 bg-[var(--color-neo-card)] shadow-[var(--shadow-neo-soft)] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[var(--color-neo-text-primary)]">
          <Paperclip size={16} />Files
        </h2>
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
      </div>

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
              onClose()
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
