import { QueryProvider } from '@/app/providers/QueryProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ThemeProvider } from '@/core/theme/ThemeProvider'
import { ToastProvider } from '@/shared/ui/Toast'
import { AppRouter } from '@/app/router/AppRouter'

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
