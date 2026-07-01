import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

import { AuthProvider } from '@/app/providers/AuthContext'
import { ConfiguracionSedeProvider } from '@/app/providers/ConfiguracionSedeContext'
import { ToastProvider } from '@/shared/ui/Toast'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfiguracionSedeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ConfiguracionSedeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}