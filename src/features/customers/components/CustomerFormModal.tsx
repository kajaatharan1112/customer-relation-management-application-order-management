import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/form/Field'
import { FormGrid } from '@/shared/ui/form/FormGrid'
import { FormActions } from '@/shared/ui/form/FormActions'
import { InviteOtpFields } from '@/shared/ui/form/InviteOtpFields'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useVerifyInvite } from '@/shared/mutations/useVerifyInvite'
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
  const [companyName, setCompanyName] = useState(customer?.companyName ?? '')
  const [addressLine, setAddressLine] = useState(customer?.addressLine ?? '')
  const [city, setCity] = useState(customer?.city ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')

  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const verify = useVerifyInvite()
  const { show } = useToast()
  const pending = create.isPending || update.isPending || verify.isPending

  const canSave = fullName.trim().length > 0 && EMAIL_RE.test(email)
  const canSendOtp = canSave && password.length >= 8
  const canVerify = otp.trim().length === 6

  const onSaveEdit = async () => {
    try {
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
      show({ type: 'success', title: 'Customer updated' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not save customer', message: (err as Error).message })
    }
  }

  const onSendOtp = async () => {
    try {
      await create.mutateAsync({
        fullName,
        email,
        phone,
        companyName: companyName || null,
        addressLine: addressLine || null,
        city: city || null,
        notes: notes || null,
      })
      setOtpSent(true)
      show({ type: 'info', title: 'Code sent', message: 'Ask them to read out the code from their invite email.' })
    } catch (err) {
      show({ type: 'error', title: 'Could not send code', message: (err as Error).message })
    }
  }

  const onVerify = async () => {
    try {
      await verify.mutateAsync({ email, token: otp, password })
      show({ type: 'success', title: 'Customer activated' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not verify code', message: (err as Error).message })
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
          {isEdit ? (
            <Button type="button" variant="primary" disabled={!canSave || pending} onClick={onSaveEdit}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          ) : (
            <>
              <Button type="button" variant="default" disabled={!canSendOtp || pending} onClick={onSendOtp}>
                {create.isPending ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
              </Button>
              {otpSent && (
                <Button type="button" variant="primary" disabled={!canVerify || pending} onClick={onVerify}>
                  {verify.isPending ? 'Verifying…' : 'Verify & activate'}
                </Button>
              )}
            </>
          )}
        </FormActions>
      }
    >
      <FormGrid>
        <Field id="c-name" label="Full name" value={fullName} disabled={otpSent} onChange={(e) => setFullName(e.target.value)} />
        <Field
          id="c-email"
          label="Email"
          type="email"
          value={email}
          readOnly={isEdit}
          disabled={otpSent}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field id="c-phone" label="Phone" value={phone} disabled={otpSent} onChange={(e) => setPhone(e.target.value)} />
        {!isEdit && (
          <InviteOtpFields
            password={password}
            onPasswordChange={setPassword}
            otp={otp}
            onOtpChange={setOtp}
            otpSent={otpSent}
          />
        )}
        <Field
          id="c-company"
          label="Company (optional)"
          value={companyName}
          disabled={otpSent}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Field
          id="c-addr"
          label="Address (optional)"
          full
          value={addressLine}
          disabled={otpSent}
          onChange={(e) => setAddressLine(e.target.value)}
        />
        <Field id="c-city" label="City (optional)" value={city} disabled={otpSent} onChange={(e) => setCity(e.target.value)} />
        <Field
          id="c-notes"
          label="Notes (optional)"
          full
          value={notes}
          disabled={otpSent}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormGrid>
    </Modal>
  )
}
