import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Onda OS',
  description: 'Sistema operacional da Onda Digital',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="flex h-screen overflow-hidden bg-bg-base">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0d1a24',
              border: '1px solid #1a2e40',
              color: '#94a3b8',
            },
          }}
        />
      </body>
    </html>
  )
}
