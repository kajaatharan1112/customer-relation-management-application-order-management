import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { useRole } from '@/core/auth/auth.hooks'
import { useWorkflowTemplates } from '@/features/settings/queries/useWorkflowTemplates'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { useDeleteWorkflow } from '@/features/settings/mutations/useWorkflowMutations'
import { useDeleteOrderType } from '@/features/settings/mutations/useOrderTypeMutations'
import { WorkflowList } from '@/features/settings/components/WorkflowList'
import { WorkflowFormModal } from '@/features/settings/components/WorkflowFormModal'
import { OrderTypeList } from '@/features/settings/components/OrderTypeList'
import { OrderTypeFormModal } from '@/features/settings/components/OrderTypeFormModal'
import type { WorkflowTemplateVM, OrderTypeVM } from '@/features/settings/settings.types'

type Tab = 'workflows' | 'order-types'

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'order-types' ? 'order-types' : 'workflows'
  const { isAdmin } = useRole()
  const { show } = useToast()

  const workflowsQuery = useWorkflowTemplates()
  const orderTypesQuery = useOrderTypes()
  const deleteWorkflow = useDeleteWorkflow()
  const deleteOrderType = useDeleteOrderType()

  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplateVM | 'new' | null>(null)
  const [editingOrderType, setEditingOrderType] = useState<OrderTypeVM | 'new' | null>(null)
  const [confirmDeleteWorkflow, setConfirmDeleteWorkflow] = useState<WorkflowTemplateVM | null>(null)
  const [confirmDeleteOrderType, setConfirmDeleteOrderType] = useState<OrderTypeVM | null>(null)

  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })

  const runDeleteWorkflow = async () => {
    if (!confirmDeleteWorkflow) return
    try {
      await deleteWorkflow.mutateAsync(confirmDeleteWorkflow.id)
      show({ type: 'success', title: 'Workflow deleted' })
    } catch (err) {
      show({ type: 'error', title: 'Could not delete workflow', message: (err as Error).message })
    } finally {
      setConfirmDeleteWorkflow(null)
    }
  }

  const runDeleteOrderType = async () => {
    if (!confirmDeleteOrderType) return
    try {
      await deleteOrderType.mutateAsync(confirmDeleteOrderType.id)
      show({ type: 'success', title: 'Order type deleted' })
    } catch (err) {
      show({ type: 'error', title: 'Could not delete order type', message: (err as Error).message })
    } finally {
      setConfirmDeleteOrderType(null)
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-neo-text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">
            Configure how orders move through your business.
          </p>
        </div>
        {isAdmin && tab === 'workflows' && (
          <Button icon={<Plus size={16} />} onClick={() => setEditingWorkflow('new')}>
            New workflow
          </Button>
        )}
        {isAdmin && tab === 'order-types' && (
          <Button icon={<Plus size={16} />} onClick={() => setEditingOrderType('new')}>
            New order type
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-[var(--color-neo-secondary)]/20">
        {(['workflows', 'order-types'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'border-b-2 border-[var(--color-neo-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-neo-primary)]'
                : 'px-3 py-2 text-sm font-medium text-[var(--color-neo-text-secondary)]'
            }
          >
            {t === 'workflows' ? 'Workflows' : 'Order Types'}
          </button>
        ))}
      </div>

      {tab === 'workflows' &&
        (workflowsQuery.isLoading ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
        ) : workflowsQuery.isError ? (
          <p className="text-sm text-[var(--color-neo-danger)]">Could not load workflows.</p>
        ) : (
          <WorkflowList
            templates={workflowsQuery.data ?? []}
            canWrite={isAdmin}
            onEdit={setEditingWorkflow}
            onDelete={setConfirmDeleteWorkflow}
          />
        ))}

      {tab === 'order-types' &&
        (orderTypesQuery.isLoading ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
        ) : orderTypesQuery.isError ? (
          <p className="text-sm text-[var(--color-neo-danger)]">Could not load order types.</p>
        ) : (
          <OrderTypeList
            orderTypes={orderTypesQuery.data ?? []}
            canWrite={isAdmin}
            onEdit={setEditingOrderType}
            onDelete={setConfirmDeleteOrderType}
          />
        ))}

      {editingWorkflow && (
        <WorkflowFormModal
          template={editingWorkflow === 'new' ? undefined : editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
        />
      )}
      {editingOrderType && (
        <OrderTypeFormModal
          orderType={editingOrderType === 'new' ? undefined : editingOrderType}
          workflows={workflowsQuery.data ?? []}
          onClose={() => setEditingOrderType(null)}
        />
      )}

      <Modal open={!!confirmDeleteWorkflow} onClose={() => setConfirmDeleteWorkflow(null)} title="Delete workflow?">
        <p className="text-sm text-[var(--color-neo-text-secondary)]">
          This deletes "{confirmDeleteWorkflow?.name}". If any order type still uses it, deletion is blocked.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDeleteWorkflow(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={runDeleteWorkflow}>
            Delete
          </Button>
        </div>
      </Modal>

      <Modal open={!!confirmDeleteOrderType} onClose={() => setConfirmDeleteOrderType(null)} title="Delete order type?">
        <p className="text-sm text-[var(--color-neo-text-secondary)]">
          This deletes "{confirmDeleteOrderType?.name}".
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDeleteOrderType(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={runDeleteOrderType}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
