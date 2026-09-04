import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/form/Field'
import { FormGrid } from '@/shared/ui/form/FormGrid'
import { FormActions } from '@/shared/ui/form/FormActions'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useCreateMember, useUpdateMember } from '@/features/team/mutations/useMemberMutations'
import { MEMBER_ROLE_LABEL, type MemberRole } from '@/shared/constants/memberRoles'
import type { MemberVM } from '@/features/team/team.types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface MemberFormModalProps {
  role: MemberRole
  member?: MemberVM
  onClose: () => void
}

export function MemberFormModal({ role, member, onClose }: MemberFormModalProps) {
  const isEdit = !!member
  const noun = MEMBER_ROLE_LABEL[role].toLowerCase()

  const [fullName, setFullName] = useState(member?.fullName ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [tempPassword, setTempPassword] = useState('')

  const create = useCreateMember()
  const update = useUpdateMember()
  const { show } = useToast()
  const pending = create.isPending || update.isPending

  const canSave =
    fullName.trim().length > 0 && EMAIL_RE.test(email) && (isEdit || tempPassword.length >= 8)

  const onSave = async () => {
    try {
      if (isEdit) {
        await update.mutateAsync({ profileId: member!.profileId, fullName, phone })
      } else {
        await create.mutateAsync({ fullName, email, phone, role, tempPassword })
      }
      show({
        type: 'success',
        title: isEdit ? `${MEMBER_ROLE_LABEL[role]} updated` : `${MEMBER_ROLE_LABEL[role]} added`,
        message: isEdit ? undefined : 'Share the temporary password with them.',
      })
      onClose()
    } catch (err) {
      show({ type: 'error', title: `Could not save ${noun}`, message: (err as Error).message })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${noun}` : `New ${noun}`}
      size="lg"
      footer={
        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={!canSave || pending} onClick={onSave}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </FormActions>
      }
    >
      <FormGrid>
        <Field id="m-name" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field
          id="m-email"
          label="Email"
          type="email"
          value={email}
          readOnly={isEdit}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field id="m-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {!isEdit && (
          <Field
            id="m-pw"
            label="Temporary password"
            type="password"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            error={
              tempPassword.length > 0 && tempPassword.length < 8 ? 'At least 8 characters' : undefined
            }
          />
        )}
      </FormGrid>
    </Modal>
  )
}
