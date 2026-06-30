import { Analytics } from '@vercel/analytics/react'

import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router/AppRouter'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'

function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
      <Analytics />
    </AppProviders>
  )
}

export default App
