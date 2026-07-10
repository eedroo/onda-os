'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BarChart2, Users, ClipboardCheck, Calendar,
  FileText, PenLine, Briefcase, Kanban, CheckSquare,
  Coins, BookOpen, Bot, Wrench, Settings, Sun, Moon
} from 'lucide-react'
import { useTheme } from '@/components/ui/ThemeProvider'

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
      { href: '/knowledge-base', icon: BookOpen,       label: 'Knowledge Base' },
      { href: '/ia-agentes',     icon: Bot,            label: 'IA & Agentes' },
      { href: '/ferramentas',    icon: Wrench,         label: 'Ferramentas' },
      { href: '/configuracoes',  icon: Settings,       label: 'Configurações' },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <aside style={{
      width: 200,
      flexShrink: 0,
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>O</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Onda OS</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>v2.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 12 }}>
        {nav.map((section) => (
          <div key={section.label} style={{ marginBottom: 4 }}>
            <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 16px', fontSize: 13, textDecoration: 'none',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'color-mix(in srgb, var(--accent-blue) 10%, transparent)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '6px 8px', marginBottom: 8,
            borderRadius: 6, border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 12, transition: 'all 0.15s',
          }}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', border: '1px solid var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent-blue)' }}>R</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ricardo</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Onda Digital</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
