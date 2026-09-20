import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { authService } from '@/core/auth/auth.service'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ROUTES } from '@/shared/constants/routes'
import { AuthShell, Field, AuthLink } from '@/features/auth/authShared'

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const { error } = await authService.updatePassword(values.password)
    if (error) {
      show({ type: 'error', title: 'Could not update password', message: error.message })
      return
    }
    show({ type: 'success', title: 'Password updated', message: 'Sign in with your new password.' })
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <AuthShell
      title="Set a new password"
      footer={<AuthLink to={ROUTES.login}>Back to sign in</AuthLink>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          icon={<Lock size={16} />}
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          icon={<Lock size={16} />}
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="mt-4">
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  )
}
