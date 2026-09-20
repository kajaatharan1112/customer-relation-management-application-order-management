import { Field } from '@/shared/ui/form/Field'

/**
 * Shared by CustomerFormModal / MemberFormModal's "Send OTP" create step:
 * a password field (set upfront, applied when the code is verified) and,
 * once the invite is sent, the 6-digit code field for the admin to type in
 * on the invitee's behalf.
 */
export function InviteOtpFields({
  password,
  onPasswordChange,
  otp,
  onOtpChange,
  otpSent,
}: {
  password: string
  onPasswordChange: (v: string) => void
  otp: string
  onOtpChange: (v: string) => void
  otpSent: boolean
}) {
  return (
    <>
      <Field
        id="invite-password"
        label="Set their password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
      />
      {otpSent && (
        <Field
          id="invite-otp"
          label="6-digit code from their invite email"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => onOtpChange(e.target.value)}
        />
      )}
    </>
  )
}
