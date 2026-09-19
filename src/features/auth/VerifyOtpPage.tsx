import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '@/core/auth/auth.service'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ROUTES } from '@/shared/constants/routes'
import { AuthShell, Field, AuthLink } from '@/features/auth/authShared'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  token: z.string().length(6, 'Enter the 6-digit code'),
})
type FormValues = z.infer<typeof schema>

export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') === 'invite' ? 'invite' : 'signup'
  const stateEmail = (location.state as { email?: string } | null)?.email ?? ''
  const [resending, setResending] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: stateEmail },
  })

  const onSubmit = async (values: FormValues) => {
    const { error } = await authService.verifyEmailOtp(values.email, values.token, type)
    if (error) {
      show({ type: 'error', title: 'Could not verify', message: error.message })
      return
    }
    show({ type: 'success', title: 'Email verified' })
    navigate(type === 'invite' ? ROUTES.resetPassword : ROUTES.dashboard, { replace: true })
  }

  const onResend = async () => {
    const email = getValues('email')
    if (!email) {
      show({ type: 'error', title: 'Enter your email first' })
      return
    }
    setResending(true)
    const { error } = await authService.resendSignupOtp(email)
    setResending(false)
    if (error) {
      show({ type: 'error', title: 'Could not resend code', message: error.message })
      return
    }
    show({ type: 'info', title: 'Code sent', message: 'Check your email for a new code.' })
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the 6-digit code we emailed you"
      footer={<AuthLink to={ROUTES.login}>Back to sign in</AuthLink>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          id="ve-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          id="ve-token"
          label="6-digit code"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          error={errors.token?.message}
          {...register('token')}
        />
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="mt-4">
          {isSubmitting ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>

      {type === 'signup' ? (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          disabled={resending}
          onClick={onResend}
          className="mt-3"
        >
          {resending ? 'Sending…' : 'Resend code'}
        </Button>
      ) : (
        <p className="mt-3 text-center text-xs text-[var(--color-neo-text-secondary)]">
          Didn&apos;t get a code? Ask your admin to resend the invite.
        </p>
      )}
    </AuthShell>
  )
}
