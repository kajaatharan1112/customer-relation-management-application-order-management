import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Mail, Phone, MapPin, MessageCircle } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useMobileBackScreen } from '@/components/navigation/MobileChromeContext'
import { cn } from '@/shared/utils/cn'
import { formatLKRShort } from '@/shared/utils/formatLKRShort'
import { formatCurrency } from '@/shared/utils/formatCurrency'
import { useCustomers } from '@/features/customers/queries/useCustomers'
import { useBills } from '@/features/bills/queries/useBills'
import { useOrderTypes } from '@/features/settings/queries/useOrderTypes'
import { customerFinancials } from '@/features/customers/customers.selectors'
import { useDeleteCustomer } from '@/features/customers/mutations/useCustomerMutations'
import { CustomerList } from '@/features/customers/components/CustomerList'
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal'
import { CustomerProfileModal } from '@/features/customers/components/CustomerProfileModal'
import { BillCard } from '@/features/bills/components/BillCard'
import { BillDetailModal } from '@/features/bills/components/BillDetailModal'
import { BillFormModal } from '@/features/bills/components/BillFormModal'
import { BILL_FILTERS, matchesFilter, type BillFilterKey } from '@/shared/constants/billStatus'
import type { CustomerVM } from '@/features/customers/customers.types'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default function CustomersPage() {
  const { data, isLoading, isError } = useCustomers()
  const bills = useBills()
  const { data: orderTypes } = useOrderTypes()
  const del = useDeleteCustomer()
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<CustomerVM | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CustomerVM | null>(null)
  const [viewingBillId, setViewingBillId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [creatingBillFor, setCreatingBillFor] = useState<CustomerVM | null>(null)
  const [billFilter, setBillFilter] = useState<BillFilterKey>('active')
  const isMobile = useIsMobile()
  // On mobile this page is single-screen, WhatsApp-style: the list, or the
  // selected customer's bills — never both. Desktop always shows the split view.
  const [mobileScreen, setMobileScreen] = useState<'list' | 'detail'>('list')
  useMobileBackScreen(isMobile && mobileScreen === 'detail', () => setMobileScreen('list'))

  const otOptions = (orderTypes ?? [])
    .filter((o) => o.isActive)
    .map((o) => ({ id: o.id, name: o.name, fixedAmount: o.fixedAmount }))

  const financials = useMemo(() => customerFinancials(bills.data ?? []), [bills.data])

  // Auto-open the first customer (like a messaging app opens the top chat),
  // and fall back to another one if the selected customer disappears.
  useEffect(() => {
    if (!data || data.length === 0) return
    if (!selectedId || !data.some((c) => c.profileId === selectedId)) {
      setSelectedId(data[0].profileId)
    }
  }, [data, selectedId])

  const total = (data ?? []).length
  const withOpenBalance = (data ?? []).filter((c) => (financials[c.profileId]?.outstanding ?? 0) > 0).length
  const totalOutstanding = Object.values(financials).reduce((s, f) => s + f.outstanding, 0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = data ?? []
    if (!q) return all
    return all.filter((c) =>
      [c.fullName, c.companyName, c.email].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [data, search])

  const selectedCustomer = (data ?? []).find((c) => c.profileId === selectedId) ?? null

  const customerBills = useMemo(() => {
    if (!selectedId) return []
    return (bills.data ?? [])
      .filter((b) => b.customerId === selectedId && matchesFilter(b, billFilter))
      .sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1))
  }, [bills.data, selectedId, billFilter])

  const runDelete = async () => {
    if (!confirmDelete) return
    try {
      await del.mutateAsync(confirmDelete.profileId)
      show({ type: 'success', title: 'Customer deleted' })
    } catch (err) {
      show({ type: 'error', title: 'Could not delete', message: (err as Error).message })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {/* Left pane — customer list, WhatsApp-style */}
      <div
        data-testid="customers-list-pane"
        className={cn(
          'h-full min-h-0 flex-col md:flex md:w-[360px] md:shrink-0 md:border-r md:border-[var(--color-neo-secondary)]/15',
          mobileScreen === 'detail' ? 'hidden' : 'flex',
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">Customers</h1>
            <p className="text-xs text-[var(--color-neo-text-secondary)]">People you bill.</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setEditing('new')}>
            Add customer
          </Button>
        </div>

        <div data-testid="customer-summary" className="grid grid-cols-3 gap-2 px-4 pb-3">
          <div className="rounded-xl bg-[var(--color-neo-surface)] px-2.5 py-2 shadow-[var(--shadow-neo-pressed)]">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Customers</div>
            <div className="mt-0.5 text-sm font-extrabold text-[var(--color-neo-text-primary)]">{total}</div>
          </div>
          <div className="rounded-xl bg-[var(--color-neo-surface)] px-2.5 py-2 shadow-[var(--shadow-neo-pressed)]">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Open bal.</div>
            <div className="mt-0.5 text-sm font-extrabold text-[var(--color-neo-text-primary)]">{withOpenBalance}</div>
          </div>
          <div className="rounded-xl bg-[var(--color-neo-surface)] px-2.5 py-2 shadow-[var(--shadow-neo-pressed)]">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">Owed</div>
            <div className="mt-0.5 truncate text-sm font-extrabold text-[var(--color-neo-danger)]">{formatLKRShort(totalOutstanding)}</div>
          </div>
        </div>

        <div className="relative px-4 pb-3">
          <Search size={16} className="absolute left-[1.875rem] top-1/2 -translate-y-1/2 text-[var(--color-neo-text-secondary)]" />
          <input
            type="text"
            aria-label="Search customers"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-bg)] pl-10 pr-4 text-sm text-[var(--color-neo-text-primary)] shadow-[var(--shadow-neo-pressed)] outline-none placeholder:text-[var(--color-neo-text-secondary)]"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {isLoading ? (
            <p className="px-2 text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
          ) : isError ? (
            <p className="px-2 text-sm text-[var(--color-neo-danger)]">Could not load customers.</p>
          ) : (
            <CustomerList
              customers={filtered}
              selectedId={selectedId}
              onSelect={(c) => {
                setSelectedId(c.profileId)
                if (isMobile) setMobileScreen('detail')
              }}
              onEdit={setEditing}
              onDelete={setConfirmDelete}
              onAddBill={setCreatingBillFor}
              financials={financials}
            />
          )}
        </div>
      </div>

      {/* Right pane — selected customer's bills */}
      <div
        data-testid="customers-detail-pane"
        className={cn(
          'h-full min-h-0 flex-col md:flex md:flex-1',
          mobileScreen === 'list' ? 'hidden' : 'flex',
        )}
      >
        {!selectedCustomer ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-[var(--color-neo-text-secondary)]">
            <MessageCircle size={40} className="opacity-40" />
            <p className="text-sm">Select a customer to view their bills.</p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              aria-label={`Open ${selectedCustomer.fullName}'s profile`}
              className="flex items-center gap-3 border-b border-[var(--color-neo-secondary)]/15 px-5 py-4 text-left transition hover:bg-[var(--color-neo-surface)]"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-neo-primary), var(--color-neo-primary-2))' }}
              >
                {initials(selectedCustomer.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-[var(--color-neo-text-primary)]">
                  {selectedCustomer.fullName}
                  {selectedCustomer.companyName && (
                    <span className="ml-2 hidden font-normal text-[var(--color-neo-text-secondary)] md:inline">{selectedCustomer.companyName}</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-[var(--color-neo-text-secondary)]">
                  <span className="hidden items-center gap-1.5 md:flex"><Mail size={12} />{selectedCustomer.email}</span>
                  <span className="flex items-center gap-1.5">
                    <Phone size={12} />
                    {selectedCustomer.phone ?? <span className="italic">No phone</span>}
                  </span>
                  <span className="hidden items-center gap-1.5 md:flex">
                    <MapPin size={12} />
                    {selectedCustomer.city ?? <span className="italic">No city</span>}
                  </span>
                </div>
              </div>
              {(financials[selectedCustomer.profileId]?.outstanding ?? 0) > 0 && (
                <span className="shrink-0 rounded-full bg-[var(--color-neo-danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--color-neo-danger)]">
                  {formatCurrency(financials[selectedCustomer.profileId]!.outstanding)} due
                </span>
              )}
            </button>

            <div className="flex flex-nowrap gap-2 overflow-x-auto border-b border-[var(--color-neo-secondary)]/15 px-5 py-3 md:flex-wrap md:overflow-visible">
              {BILL_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={billFilter === f.key}
                  onClick={() => setBillFilter(f.key)}
                  className={
                    billFilter === f.key
                      ? 'h-8 shrink-0 rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-primary)] px-4 text-xs font-semibold text-white shadow-[var(--shadow-neo-soft)]'
                      : 'h-8 shrink-0 rounded-[var(--radius-neo-pill)] bg-[var(--color-neo-surface)] px-4 text-xs font-semibold text-[var(--color-neo-text-secondary)] shadow-[var(--shadow-neo-pressed)]'
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              {customerBills.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--color-neo-text-secondary)]">No bills yet for this customer.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {customerBills.map((b) => (
                    <BillCard key={b.id} bill={b} onOpen={(bill) => setViewingBillId(bill.id)} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editing && (
        <CustomerFormModal
          customer={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete customer?">
        {confirmDelete && confirmDelete.billCount > 0 ? (
          <p className="text-sm text-[var(--color-neo-text-secondary)]">
            "{confirmDelete.fullName}" has {confirmDelete.billCount} active bill(s). Delete those first.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--color-neo-text-secondary)]">
              This disables "{confirmDelete?.fullName}" and hides them from the list.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={runDelete}>
                Delete
              </Button>
            </div>
          </>
        )}
      </Modal>

      <BillDetailModal billId={viewingBillId} onClose={() => setViewingBillId(null)} />

      {showProfile && selectedCustomer && (
        <CustomerProfileModal customer={selectedCustomer} onClose={() => setShowProfile(false)} />
      )}

      {creatingBillFor && (
        <BillFormModal
          customers={data ?? []}
          orderTypes={otOptions}
          defaultCustomerId={creatingBillFor.profileId}
          onClose={() => setCreatingBillFor(null)}
          onSaved={(id) => {
            setCreatingBillFor(null)
            setViewingBillId(id)
          }}
        />
      )}
    </div>
  )
}
