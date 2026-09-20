import { Modal } from '@/shared/ui/Modal'
import { BillDetailView } from '@/features/bills/components/BillDetailView'

export function BillDetailModal({ billId, onClose }: { billId: string | null; onClose: () => void }) {
  return (
    <Modal open={!!billId} onClose={onClose} size="xl">
      {billId && <BillDetailView billId={billId} onClose={onClose} />}
    </Modal>
  )
}
