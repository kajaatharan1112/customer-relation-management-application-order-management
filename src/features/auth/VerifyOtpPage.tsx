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
  email: z.string().email('Enter a valid email'),
  token: z.string().length(6, 'Enter the 6-digit code'),
})
type FormValues = z.infer<typeof schema>

/** For an admin-invited employee/admin/customer: they type the email + the
 * 6-digit code from their invite email (instead of clicking the link) to
 * verify and land on /reset-password to set their password. */
export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const { error } = await authService.verifyEmailOtp(values.email, values.token, 'invite')
    if (error) {
      show({ type: 'error', title: 'Could not verify', message: error.message })
      return
    }
    show({ type: 'success', title: 'Email verified' })
    navigate(ROUTES.resetPassword, { replace: true })
  }

  return (
    <AuthShell
      title="Verify your invite"
      subtitle="Enter the 6-digit code your invite email sent you"
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

      <p className="mt-3 text-center text-xs text-[var(--color-neo-text-secondary)]">
        Didn&apos;t get a code? Ask your admin to resend the invite.
      </p>
    </AuthShell>
  )
}
