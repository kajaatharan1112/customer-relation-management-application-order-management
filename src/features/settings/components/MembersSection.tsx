import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { useMembers } from '@/features/team/queries/useMembers'
import { useSetMemberStatus } from '@/features/team/mutations/useMemberMutations'
import { MemberList } from '@/features/team/components/MemberList'
import { MemberFormModal } from '@/features/team/components/MemberFormModal'
import { MEMBER_ROLE_LABEL, type MemberRole } from '@/shared/constants/memberRoles'
import type { MemberVM } from '@/features/team/team.types'

const COPY: Record<MemberRole, { title: string; sub: string; empty: string }> = {
  admin_member: {
    title: 'Admins',
    sub: 'People who can manage settings and everything else',
    empty: 'No admins yet',
  },
  employee: {
    title: 'Employees',
    sub: 'Staff who work on orders, no settings access',
    empty: 'No employees yet',
  },
}

export function MembersSection({ role, isAdmin }: { role: MemberRole; isAdmin: boolean }) {
  const q = useMembers(role)
  const setStatus = useSetMemberStatus()
  const { show } = useToast()
  const [editing, setEditing] = useState<MemberVM | 'new' | null>(null)
  const [confirm, setConfirm] = useState<{ m: MemberVM; status: 'active' | 'disabled' } | null>(null)

  const copy = COPY[role]
  const noun = MEMBER_ROLE_LABEL[role].toLowerCase()

  const runSetStatus = async () => {
    if (!confirm) return
    try {
      await setStatus.mutateAsync({ profileId: confirm.m.profileId, status: confirm.status })
      show({
        type: 'success',
        title: confirm.status === 'disabled' ? `${MEMBER_ROLE_LABEL[role]} disabled` : `${MEMBER_ROLE_LABEL[role]} enabled`,
      })
    } catch (err) {
      show({ type: 'error', title: 'Could not change status', message: (err as Error).message })
    } finally {
      setConfirm(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-neo-text-primary)]">
            {copy.title}
          </h1>
          <p className="text-sm text-[var(--color-neo-text-secondary)]">{copy.sub}</p>
        </div>
        {isAdmin && (
          <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
            New {noun}
          </Button>
        )}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : q.isError ? (
        <p className="text-sm text-[var(--color-neo-danger)]">Could not load {copy.title.toLowerCase()}.</p>
      ) : (
        <MemberList
          members={q.data ?? []}
          onEdit={setEditing}
          onSetStatus={(m, status) => setConfirm({ m, status })}
          emptyCopy={copy.empty}
        />
      )}

      {editing && (
        <MemberFormModal
          role={role}
          member={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.status === 'disabled' ? `Disable ${confirm?.m.fullName}?` : `Enable ${confirm?.m.fullName}?`}
      >
        <p className="text-sm text-[var(--color-neo-text-secondary)]">
          {confirm?.status === 'disabled'
            ? `They will no longer be able to sign in. Their history stays.`
            : `They will be able to sign in again.`}
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant={confirm?.status === 'disabled' ? 'danger' : 'primary'}
            onClick={runSetStatus}
          >
            {confirm?.status === 'disabled' ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
