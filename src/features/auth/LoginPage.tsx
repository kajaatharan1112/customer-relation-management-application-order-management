import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { authService } from '@/core/auth/auth.service'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ROUTES } from '@/shared/constants/routes'
import { AuthShell, Field, AuthLink } from '@/features/auth/authShared'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const { error } = await authService.signInWithPassword(values.email, values.password)
    if (error) {
      show({ type: 'error', title: 'Sign in failed', message: error.message })
      return
    }
    navigate(ROUTES.dashboard, { replace: true })
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to ONEVO"
      footer={
        <>
          New here? <AuthLink to={ROUTES.register}>Create an account</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          icon={<Mail size={16} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          icon={<Lock size={16} />}
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="mt-2 text-right text-sm">
          <AuthLink to={ROUTES.forgotPassword}>Forgot password?</AuthLink>
        </div>
        <div className="mt-1 text-right text-sm">
          <AuthLink to={`${ROUTES.verifyEmail}?type=invite`}>Have an invite code?</AuthLink>
        </div>
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="mt-4">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
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
