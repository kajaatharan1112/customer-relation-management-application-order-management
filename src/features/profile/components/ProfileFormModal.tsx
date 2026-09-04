import { useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/form/Field'
import { FormGrid } from '@/shared/ui/form/FormGrid'
import { FormActions } from '@/shared/ui/form/FormActions'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { useOwnProfile } from '@/features/profile/queries/useOwnProfile'
import { useUpdateOwnProfile } from '@/features/profile/mutations/useUpdateOwnProfile'
import { useChangePassword } from '@/features/profile/mutations/useChangePassword'

export function ProfileFormModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useOwnProfile()
  const updateProfile = useUpdateOwnProfile()
  const changePassword = useChangePassword()
  const { show } = useToast()

  const [fullName, setFullName] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')

  const nameValue = fullName ?? data?.fullName ?? ''
  const phoneValue = phone ?? data?.phone ?? ''

  const canSaveDetails = nameValue.trim().length > 0 && !updateProfile.isPending
  const canChangePw = pw.length >= 8 && pw === pw2 && !changePassword.isPending

  const saveDetails = async () => {
    try {
      await updateProfile.mutateAsync({ fullName: nameValue.trim(), phone: phoneValue.trim() || null })
      show({ type: 'success', title: 'Profile updated' })
      onClose()
    } catch (err) {
      show({ type: 'error', title: 'Could not update profile', message: (err as Error).message })
    }
  }

  const changePw = async () => {
    try {
      await changePassword.mutateAsync(pw)
      setPw('')
      setPw2('')
      show({ type: 'success', title: 'Password changed' })
    } catch (err) {
      show({ type: 'error', title: 'Could not change password', message: (err as Error).message })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit profile"
      size="lg"
      footer={
        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="primary" disabled={!canSaveDetails} onClick={saveDetails}>
            {updateProfile.isPending ? 'Saving…' : 'Save'}
          </Button>
        </FormActions>
      }
    >
      {isLoading ? (
        <p className="text-sm text-[var(--color-neo-text-secondary)]">Loading…</p>
      ) : (
        <>
          <FormGrid>
            <Field
              id="p-name"
              label="Full name"
              value={nameValue}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Field
              id="p-phone"
              label="Phone"
              value={phoneValue}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Field id="p-email" label="Email" value={data?.email ?? ''} readOnly full />
          </FormGrid>

          <div className="mt-6 border-t border-black/5 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-neo-text-primary)]">
              Change password
            </h3>
            <FormGrid>
              <Field
                id="p-pw"
                label="New password"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                error={pw.length > 0 && pw.length < 8 ? 'At least 8 characters' : undefined}
              />
              <Field
                id="p-pw2"
                label="Confirm password"
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                error={pw2.length > 0 && pw2 !== pw ? 'Does not match' : undefined}
              />
            </FormGrid>
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="default" disabled={!canChangePw} onClick={changePw}>
                {changePassword.isPending ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
