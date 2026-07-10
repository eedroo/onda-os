import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
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
          <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
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
