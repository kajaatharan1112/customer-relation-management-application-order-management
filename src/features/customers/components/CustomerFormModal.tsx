import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/form/Field'
import { FormGrid } from '@/shared/ui/form/FormGrid'
import { FormActions } from '@/shared/ui/form/FormActions'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import {
  useCreateCustomer,
  useUpdateCustomer,
} from '@/features/customers/mutations/useCustomerMutations'
import type { CustomerVM } from '@/features/customers/customers.types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function CustomerFormModal({
  customer,
  onClose,
}: {
  customer?: CustomerVM
  onClose: () => void
}) {
  const isEdit = !!customer
  const [fullName, setFullName] = useState(customer?.fullName ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [tempPassword, setTempPassword] = useState('')
  const [companyName, setCompanyName] = useState(customer?.companyName ?? '')
  const [addressLine, setAddressLine] = useState(customer?.addressLine ?? '')
  const [city, setCity] = useState(customer?.city ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')

  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const { show } = useToast()
  const pending = create.isPending || update.isPending

  const canSave =
    fullName.trim().length > 0 && EMAIL_RE.test(email) && (isEdit || tempPassword.length >= 8)

  const onSave = async () => {
    try {
      if (isEdit) {
        await update.mutateAsync({
          profileId: customer!.profileId,
          input: {
            fullName,
            phone,
            companyName: companyName || null,
            addressLine: addressLine || null,
            city: city || null,
            notes: notes || null,
          },
        })
      } else {
        await create.mutateAsync({
          fullName,
          email,
          phone,
          tempPassword,
          companyName: companyName || null,
          addressLine: addressLine || null,
          city: city || null,
          notes: notes || null,
        })
      }
      show({ type: 'success', title: isEdit ? 'Customer updated' : 'Customer added' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save customer', message: (err as Error).message })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit customer' : 'Add customer'}
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
        <Field id="c-name" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field
          id="c-email"
          label="Email"
          type="email"
          value={email}
          readOnly={isEdit}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field id="c-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Field
          id="c-company"
          label="Company (optional)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Field
          id="c-addr"
          label="Address (optional)"
          full
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
        <Field id="c-city" label="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
        {!isEdit && (
          <Field
            id="c-pw"
            label="Temporary password"
            type="password"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            error={
              tempPassword.length > 0 && tempPassword.length < 8 ? 'At least 8 characters' : undefined
            }
          />
        )}
        <Field
          id="c-notes"
          label="Notes (optional)"
          full
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormGrid>
    </Modal>
  )
}
