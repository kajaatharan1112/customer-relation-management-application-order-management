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
  useCreateMember,
  useUpdateMember,
  useUpdateMemberOtherDetails,
} from '@/features/team/mutations/useMemberMutations'
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
  const [contactNumber, setContactNumber] = useState(member?.contactNumber ?? '')
  const [addressLine, setAddressLine] = useState(member?.addressLine ?? '')
  const [city, setCity] = useState(member?.city ?? '')
  const [nic, setNic] = useState(member?.nic ?? '')
  const [designation, setDesignation] = useState(member?.designation ?? '')
  const [department, setDepartment] = useState(member?.department ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(member?.dateOfBirth ?? '')

  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const create = useCreateMember()
  const update = useUpdateMember()
  const updateOther = useUpdateMemberOtherDetails()
  const verify = useVerifyInvite()
  const { show } = useToast()

  const otherDetails = {
    contactNumber: contactNumber || null,
    addressLine: addressLine || null,
    city: city || null,
    nic: nic || null,
    designation: designation || null,
    department: department || null,
    dateOfBirth: dateOfBirth || null,
  }

  const dirty =
    isEdit &&
    (fullName !== member!.fullName ||
      phone !== (member!.phone ?? '') ||
      contactNumber !== (member!.contactNumber ?? '') ||
      addressLine !== (member!.addressLine ?? '') ||
      city !== (member!.city ?? '') ||
      nic !== (member!.nic ?? '') ||
      designation !== (member!.designation ?? '') ||
      department !== (member!.department ?? '') ||
      dateOfBirth !== (member!.dateOfBirth ?? ''))

  const canSave = fullName.trim().length > 0 && EMAIL_RE.test(email) && (!isEdit || dirty)
  const canSendOtp = canSave && password.length >= 8
  const canVerify = otp.trim().length === 6

  const onSaveEdit = async () => {
    try {
      await update.mutateAsync({ profileId: member!.profileId, fullName, phone })
      await updateOther.mutateAsync({ profileId: member!.profileId, otherDetails })
      show({ type: 'success', title: `${MEMBER_ROLE_LABEL[role]} updated` })
      onClose()
    } catch (err) {
      show({ type: 'error', title: `Could not save ${noun}`, message: (err as Error).message })
    }
  }

  const onSendOtp = async () => {
    try {
      await create.mutateAsync({ fullName, email, phone, role, otherDetails })
      setOtpSent(true)
      show({ type: 'info', title: 'Code sent', message: `Ask them to read out the code from their invite email.` })
    } catch (err) {
      show({ type: 'error', title: 'Could not send code', message: (err as Error).message })
    }
  }

  const onVerify = async () => {
    try {
      await verify.mutateAsync({ email, token: otp, password })
      show({ type: 'success', title: `${MEMBER_ROLE_LABEL[role]} activated` })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not verify code', message: (err as Error).message })
    }
  }

  const pending = create.isPending || update.isPending || updateOther.isPending || verify.isPending

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
          {isEdit ? (
            dirty && (
              <Button type="button" variant="primary" disabled={!canSave || pending} onClick={onSaveEdit}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
            )
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
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
        Personal details
      </p>
      <FormGrid>
        <Field id="m-name" label="Full name" value={fullName} disabled={otpSent} onChange={(e) => setFullName(e.target.value)} />
        <Field
          id="m-email"
          label="Email"
          type="email"
          value={email}
          readOnly={isEdit}
          disabled={otpSent}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field id="m-phone" label="Phone" value={phone} disabled={otpSent} onChange={(e) => setPhone(e.target.value)} />
        {!isEdit && (
          <InviteOtpFields
            password={password}
            onPasswordChange={setPassword}
            otp={otp}
            onOtpChange={setOtp}
            otpSent={otpSent}
          />
        )}
      </FormGrid>

      <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-[var(--color-neo-text-secondary)]">
        Other details (optional)
      </p>
      <FormGrid>
        <Field id="m-contact" label="Contact number" value={contactNumber} disabled={otpSent} onChange={(e) => setContactNumber(e.target.value)} />
        <Field id="m-nic" label="NIC / ID number" value={nic} disabled={otpSent} onChange={(e) => setNic(e.target.value)} />
        <Field id="m-address" label="Address" full value={addressLine} disabled={otpSent} onChange={(e) => setAddressLine(e.target.value)} />
        <Field id="m-city" label="City" value={city} disabled={otpSent} onChange={(e) => setCity(e.target.value)} />
        <Field id="m-dob" label="Date of birth" type="date" value={dateOfBirth} disabled={otpSent} onChange={(e) => setDateOfBirth(e.target.value)} />
        <Field id="m-designation" label="Designation" value={designation} disabled={otpSent} onChange={(e) => setDesignation(e.target.value)} />
        <Field id="m-department" label="Department" value={department} disabled={otpSent} onChange={(e) => setDepartment(e.target.value)} />
      </FormGrid>
    </Modal>
  )
}
