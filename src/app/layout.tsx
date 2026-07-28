import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { AuthProvider } from '@/lib/auth'
import AuthGate from '@/components/auth/AuthGate'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Onda OS',
  description: 'Sistema operacional da Onda Digital',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AuthGate>{children}</AuthGate>
          </AuthProvider>
          <Toaster
            theme="system"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
