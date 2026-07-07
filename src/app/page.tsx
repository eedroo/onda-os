import { Users, Calendar, Briefcase, Coins, AlertTriangle, Plus, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const kpis = [
  { label: 'Leads ativos',    value: '12',     sub: '3 quentes este mês',      color: 'text-accent-blue',   border: 'border-t-sky-500',    icon: Users },
  { label: 'Reuniões',        value: '4',      sub: '2 esta semana',           color: 'text-accent-teal',   border: 'border-t-cyan-500',   icon: Calendar },
  { label: 'Clientes ativos', value: '7',      sub: '2 em onboarding',         color: 'text-accent-green',  border: 'border-t-green-500',  icon: Briefcase },
  { label: 'MRR',             value: '1.892€', sub: '+12% vs mês anterior',    color: 'text-accent-purple', border: 'border-t-violet-500', icon: Coins },
]

const todayTasks = [
  { text: 'Reunião Clínica Beleza X',  tag: 'reunião',   tagColor: 'pill-blue',   done: true },
  { text: 'Auditoria Hotel Douro Y',   tag: 'auditoria', tagColor: 'pill-green',  done: false },
  { text: 'Enviar proposta Spa Zen Z', tag: 'proposta',  tagColor: 'pill-amber',  done: false },
]

const alerts = [
  { text: 'Lead parado há 5 dias',     sub: 'Restaurante Mar sem follow-up',           dot: 'bg-orange-500' },
  { text: 'Proposta aguarda resposta', sub: 'Ginásio FitLife, enviada há 8 dias',      dot: 'bg-yellow-500' },
  { text: 'Cliente sem onboarding',    sub: 'Studio K fechou, kickoff por agendar',    dot: 'bg-red-500' },
]

const shortcuts = [
  { label: '+ Lead',    href: '/leads',      color: 'text-accent-blue' },
  { label: '+ Reunião', href: '/reunioes',   color: 'text-accent-teal' },
  { label: '+ Cliente', href: '/clientes',   color: 'text-accent-green' },
  { label: '+ Projeto', href: '/projetos',   color: 'text-accent-purple' },
  { label: '+ Receita', href: '/financeiro', color: 'text-accent-amber' },
]

export default function Home() {
  const dateStr = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-surface">
        <div>
          <div className="text-[18px] font-medium text-text-primary">Bom dia, Ricardo 👋</div>
          <div className="text-[12px] text-text-muted capitalize mt-0.5">{dateStr}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-sky-950 border border-sky-900 flex items-center justify-center text-[12px] font-semibold text-accent-blue">R</div>
      </div>

      <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className={`card p-3.5 border-t-2 ${k.border}`}>
                <div className="text-[11px] text-text-muted mb-2 flex items-center gap-1.5">
                  <Icon size={12} /> {k.label}
                </div>
                <div className={`text-2xl font-medium ${k.color}`}>{k.value}</div>
                <div className="text-[10px] text-text-faint mt-1">{k.sub}</div>
              </div>
            )
          })}
        </div>

        {/* Hoje + Alertas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="sec-title mb-0"><Calendar size={12} /> Hoje</div>
              <span className="text-[11px] text-text-faint">
                {new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            {todayTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 border-b border-border-subtle last:border-0">
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${t.done ? 'bg-brand' : 'border border-border-strong'}`}>
                  {t.done && <span className="text-white text-[8px]">✓</span>}
                </div>
                <span className={`text-[13px] flex-1 ${t.done ? 'text-text-faint line-through' : 'text-text-secondary'}`}>{t.text}</span>
                <span className={`pill ${t.tagColor}`}>{t.tag}</span>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="sec-title"><AlertTriangle size={12} /> Próximos passos</div>
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border-subtle last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${a.dot}`} />
                <div>
                  <div className="text-[12.5px] font-medium text-text-secondary">{a.text}</div>
                  <div className="text-[11px] text-text-faint mt-0.5">{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Atalhos */}
        <div className="card p-4">
          <div className="sec-title"><Plus size={12} /> Atalhos rápidos</div>
          <div className="grid grid-cols-5 gap-2">
            {shortcuts.map((s) => (
              <Link key={s.href} href={s.href}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-bg-input border border-border-subtle rounded-lg hover:border-border-strong transition-colors">
                <span className={`text-[12px] font-medium ${s.color}`}>{s.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
