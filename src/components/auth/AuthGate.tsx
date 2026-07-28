'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'

const ROTAS_PUBLICAS = ['/login', '/registar']

function TelaCentral({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)', flexDirection: 'column', gap: 10, padding: 20, textAlign: 'center' }}>
      {children}
    </div>
  )
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, perfil, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const rotaPublica = ROTAS_PUBLICAS.includes(pathname)

  useEffect(() => {
    if (loading) return
    if (!user && !rotaPublica) router.replace('/login')
    if (user && perfil && perfil.role !== 'PENDENTE' && rotaPublica) router.replace('/')
  }, [loading, user, perfil, rotaPublica, router])

  if (rotaPublica) return <>{children}</>

  if (loading || !user) {
    return <TelaCentral><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></TelaCentral>
  }

  if (!perfil) {
    return (
      <TelaCentral>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Perfil não encontrado</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 340 }}>A tua conta existe mas não tem um perfil associado. Contacta um administrador.</div>
      </TelaCentral>
    )
  }

  if (perfil.role === 'PENDENTE') {
    return (
      <TelaCentral>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Conta a aguardar aprovação</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 340 }}>Um administrador precisa de aprovar o teu acesso antes de poderes usar o Onda OS.</div>
      </TelaCentral>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
