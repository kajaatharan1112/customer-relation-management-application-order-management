import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/core/auth/auth.service'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ROUTES } from '@/shared/constants/routes'
import { AuthShell, Field, AuthLink } from '@/features/auth/authShared'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  otp: z.string().length(6, 'Enter the 6-digit code'),
})
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSendOtp = async () => {
    const valid = await trigger(['fullName', 'email'])
    if (!valid) return

    setSendingOtp(true)
    const { fullName, email } = getValues()
    const { error } = await authService.sendSignupOtp(email, fullName)
    setSendingOtp(false)

    if (error) {
      show({ type: 'error', title: 'Could not send code', message: error.message })
      return
    }
    setOtpSent(true)
    show({ type: 'info', title: 'Code sent', message: 'Enter the 6-digit code we emailed you.' })
  }

  const onSubmit = async (values: FormValues) => {
    const { error } = await authService.verifyEmailOtp(values.email, values.otp, 'email')
    if (error) {
      show({ type: 'error', title: 'Could not verify code', message: error.message })
      return
    }
    const { error: pwError } = await authService.updatePassword(values.password)
    if (pwError) {
      show({ type: 'error', title: 'Signed in, but could not set password', message: pwError.message })
    }
    navigate(ROUTES.dashboard, { replace: true })
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Track your orders and bills in one place"
      footer={
        <>
          Already have an account? <AuthLink to={ROUTES.login}>Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          id="fullName"
          label="Full name"
          autoComplete="name"
          disabled={otpSent}
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              disabled={otpSent}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <Button
            type="button"
            variant="default"
            disabled={sendingOtp}
            onClick={onSendOtp}
            className="mt-[26px] shrink-0"
          >
            {sendingOtp ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
          </Button>
        </div>
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {otpSent && (
          <Field
            id="otp"
            label="6-digit code"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            error={errors.otp?.message}
            {...register('otp')}
          />
        )}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!otpSent || isSubmitting}
          className="mt-4"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-neo-text-secondary)]">
        <span className="h-px flex-1 bg-[var(--color-neo-secondary)]/30" />
        or
        <span className="h-px flex-1 bg-[var(--color-neo-secondary)]/30" />
      </div>

      <Button type="button" variant="default" fullWidth onClick={() => authService.signInWithGoogle()}>
        Continue with Google
      </Button>
    </AuthShell>
  )
}
