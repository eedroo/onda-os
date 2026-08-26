'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, BarChart2, Users, ClipboardCheck, Calendar,
  FileText, PenLine, Briefcase, Kanban, CheckSquare,
  Coins, BookOpen, Bot, Wrench, Settings, Sun, Moon, LogOut, LineChart
} from 'lucide-react'
import { useTheme } from '@/components/ui/ThemeProvider'
import { useAuth } from '@/lib/auth'

const nav = [
  {
    label: 'Principal',
    items: [{ href: '/', icon: Home, label: 'Home' }]
  },
  {
    label: 'Comercial',
    items: [
      { href: '/dashboard',      icon: BarChart2,      label: 'Dashboard' },
      { href: '/leads',          icon: Users,          label: 'Leads' },
      { href: '/auditorias',     icon: ClipboardCheck, label: 'Auditorias' },
      { href: '/reunioes',       icon: Calendar,       label: 'Reuniões' },
      { href: '/propostas',      icon: FileText,       label: 'Propostas' },
      { href: '/contratos',      icon: PenLine,        label: 'Contratos' },
    ]
  },
  {
    label: 'Operações',
    items: [
      { href: '/clientes',       icon: Briefcase,      label: 'Clientes' },
      { href: '/projetos',       icon: Kanban,         label: 'Projetos' },
      { href: '/tarefas',        icon: CheckSquare,    label: 'Tarefas' },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { href: '/financeiro',     icon: Coins,          label: 'Financeiro' },
      { href: '/kpis',           icon: LineChart,      label: 'KPIs' },
      { href: '/knowledge-base', icon: BookOpen,       label: 'Knowledge Base' },
      { href: '/ia-agentes',     icon: Bot,            label: 'IA & Agentes' },
      { href: '/ferramentas',    icon: Wrench,         label: 'Ferramentas' },
      { href: '/configuracoes',  icon: Settings,       label: 'Configurações' },
    ]
  },
]

function FooterRow({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '9px 12px',
        borderRadius: 10, border: 'none',
        backgroundColor: 'transparent', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: 13, fontWeight: 400, textAlign: 'left',
        transition: 'background-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </button>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const { perfil, logout } = useAuth()

  async function onLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <aside style={{
      width: 216,
      flexShrink: 0,
      backgroundColor: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 16px 16px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Onda OS</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
          {perfil?.role === 'ADMIN' ? 'Administrador' : 'Utilizador'}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 10px' }}>
        {nav.map((section) => (
          <div key={section.label} style={{ marginBottom: 14 }}>
            <div style={{ padding: '0 10px 6px', fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', marginBottom: 2, fontSize: 13.5, fontWeight: isActive ? 500 : 400,
                  textDecoration: 'none', borderRadius: 10,
                  color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--sidebar-border)' }}>
        <FooterRow icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} onClick={toggle} />
        <FooterRow icon={LogOut} label="Sair" onClick={onLogout} />
      </div>
    </aside>
  )
}
