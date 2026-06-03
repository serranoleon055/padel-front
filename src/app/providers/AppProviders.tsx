import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

import { AuthProvider } from '@/app/providers/AuthContext'
import { ToastProvider } from '@/shared/ui/Toast'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}