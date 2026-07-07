'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BarChart2, Users, ClipboardCheck, Calendar,
  FileText, PenLine, Briefcase, Kanban, CheckSquare,
  Coins, BookOpen, Bot, Wrench, Settings
} from 'lucide-react'

const nav = [
  {
    label: 'Principal',
    items: [{ href: '/', icon: Home, label: 'Home' }]
  },
  {
    label: 'Comercial',
    items: [
      { href: '/dashboard',     icon: BarChart2,      label: 'Dashboard' },
      { href: '/leads',         icon: Users,          label: 'Leads' },
      { href: '/auditorias',    icon: ClipboardCheck, label: 'Auditorias' },
      { href: '/reunioes',      icon: Calendar,       label: 'Reuniões' },
      { href: '/propostas',     icon: FileText,       label: 'Propostas' },
      { href: '/contratos',     icon: PenLine,        label: 'Contratos' },
    ]
  },
  {
    label: 'Operações',
    items: [
      { href: '/clientes',      icon: Briefcase,      label: 'Clientes' },
      { href: '/projetos',      icon: Kanban,   label: 'Projetos' },
      { href: '/tarefas',       icon: CheckSquare,    label: 'Tarefas' },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { href: '/financeiro',    icon: Coins,          label: 'Financeiro' },
      { href: '/knowledge-base',icon: BookOpen,       label: 'Knowledge Base' },
      { href: '/ia-agentes',    icon: Bot,            label: 'IA & Agentes' },
      { href: '/ferramentas',   icon: Wrench,         label: 'Ferramentas' },
      { href: '/configuracoes', icon: Settings,       label: 'Configurações' },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[200px] flex-shrink-0 bg-bg-surface border-r border-border-subtle flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2 border-b border-border-subtle">
        <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center text-white text-sm font-semibold">O</div>
        <div>
          <div className="text-[14px] font-medium text-text-primary">Onda OS</div>
          <div className="text-[10px] text-text-muted tracking-widest uppercase">v2.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {nav.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="px-4 py-1.5 text-[10px] font-medium text-text-faint tracking-widest uppercase">
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-1.5 text-[13px] transition-colors
                    ${isActive
                      ? 'bg-sky-950 text-accent-blue border-l-2 border-brand'
                      : 'text-text-muted hover:bg-slate-800/50 hover:text-text-secondary'
                    }`}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-3 border-t border-border-subtle flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-sky-950 border border-sky-900 flex items-center justify-center text-[11px] font-semibold text-accent-blue">R</div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-text-secondary truncate">Ricardo</div>
          <div className="text-[10px] text-text-faint truncate">Onda Digital</div>
        </div>
      </div>
    </aside>
  )
}
