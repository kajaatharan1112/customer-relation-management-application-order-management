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
})
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const { error } = await authService.signUpWithPassword(values.email, values.password, values.fullName)
    if (error) {
      show({ type: 'error', title: 'Sign up failed', message: error.message })
      return
    }
    show({ type: 'success', title: 'Check your email', message: 'Confirm your address to finish signing up.' })
    navigate(ROUTES.login, { replace: true })
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
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="mt-4">
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
