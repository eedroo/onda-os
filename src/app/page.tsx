'use client'

import { useEffect, useState } from 'react'
import { Users, Calendar, Briefcase, Coins, AlertTriangle, Plus, Loader2, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import { clientesService, projetosService, tarefasService, type Tarefa, type Cliente, type Projeto } from '@/lib/db'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([clientesService.getAll(), projetosService.getAll()])
      setClientes(c)
      setProjetos(p)
      if (c.length) {
        const ids = c.map(x => x.id!).filter(Boolean)
        const t = await tarefasService.getPendentes(ids)
        setTarefas(t)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function toggleTarefa(tarefa: Tarefa) {
    const novo = tarefa.status === 'CONCLUIDA' ? 'PENDENTE' as const : 'CONCLUIDA' as const
    await tarefasService.update(tarefa.id!, { status: novo })
    setTarefas(prev => prev.map(t => t.id === tarefa.id ? { ...t, status: novo } : t))
  }

  const dateStr = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // KPIs reais
  const clientesAtivos = clientes.filter(c => c.status === 'ATIVO')
  const mrr = clientesAtivos.reduce((s, c) => s + c.mrr, 0)
  const projetosAtivos = projetos.filter(p => p.status !== 'CONCLUIDO')
  const tarefasPendentes = tarefas.filter(t => t.status === 'PENDENTE' || t.status === 'EM_CURSO')
  const tarefasHoje = tarefasPendentes.slice(0, 5)

  // Alertas — tarefas paradas, projectos sem progresso
  const alertas = []
  const projetosSemProgresso = projetosAtivos.filter(p => p.progresso === 0)
  if (projetosSemProgresso.length > 0) {
    alertas.push({ text: `${projetosSemProgresso.length} projecto(s) sem progresso`, sub: projetosSemProgresso.map(p => p.clienteNome).join(', '), dot: 'var(--accent-amber)' })
  }
  const clientesOnboarding = clientes.filter(c => c.status === 'ONBOARDING')
  if (clientesOnboarding.length > 0) {
    alertas.push({ text: `${clientesOnboarding.length} cliente(s) em onboarding`, sub: clientesOnboarding.map(c => c.empresa).join(', '), dot: 'var(--accent-red)' })
  }
  if (tarefasPendentes.length > 10) {
    alertas.push({ text: `${tarefasPendentes.length} tarefas pendentes`, sub: 'Verifica a página de Tarefas', dot: 'var(--accent-amber)' })
  }

  const kpis = [
    { label: 'Clientes ativos',   value: clientesAtivos.length.toString(), sub: `${clientes.filter(c => c.status === 'ONBOARDING').length} em onboarding`, color: 'var(--accent-blue)',   border: 'var(--accent-blue)',   icon: Briefcase },
    { label: 'Projetos ativos',   value: projetosAtivos.length.toString(),  sub: `${projetos.filter(p => p.status === 'CONCLUIDO').length} concluídos`,      color: 'var(--accent-teal)',   border: 'var(--accent-teal)',   icon: Calendar },
    { label: 'Tarefas pendentes', value: tarefasPendentes.length.toString(), sub: 'este mês',                                                                color: 'var(--accent-amber)',  border: 'var(--accent-amber)',  icon: Users },
    { label: 'MRR',               value: `${mrr.toLocaleString('pt-PT')}€`, sub: `${clientesAtivos.length} clientes`,                                        color: 'var(--accent-purple)', border: 'var(--accent-purple)', icon: Coins },
  ]

  const shortcuts = [
    { label: '+ Cliente',  href: '/clientes/novo', color: 'var(--accent-blue)' },
    { label: '+ Projetos', href: '/projetos',       color: 'var(--accent-teal)' },
    { label: '+ Tarefas',  href: '/tarefas',        color: 'var(--accent-green)' },
    { label: '+ Financeiro', href: '/financeiro',   color: 'var(--accent-purple)' },
    { label: '+ Lead',     href: '/leads',          color: 'var(--accent-amber)' },
  ]

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>Bom dia, Ricardo 👋</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>{dateStr}</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', border: '1px solid var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)' }}>R</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="card" style={{ padding: '12px 14px', borderTop: `2px solid ${k.border}` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon size={12} /> {k.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>{k.sub}</div>
              </div>
            )
          })}
        </div>

        {/* Tarefas + Alertas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Tarefas de hoje */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckSquare size={12} /> Tarefas pendentes
              </div>
              <Link href="/tarefas" style={{ fontSize: 11, color: 'var(--accent-blue)', textDecoration: 'none' }}>Ver todas →</Link>
            </div>

            {tarefasHoje.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text-faint)' }}>
                {projetos.length === 0 ? 'Cria os projetos do mês primeiro' : '✅ Tudo em dia!'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tarefasHoje.map(t => (
                  <div key={t.id} onClick={() => toggleTarefa(t)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 4px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'opacity 0.1s' }}
                    className="last:border-0"
                  >
                    {t.status === 'CONCLUIDA'
                      ? <CheckSquare size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                      : <Square size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 12.5, flex: 1, color: t.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: t.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
                      {t.titulo}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                      {clientes.find(c => c.id === t.clienteId)?.empresa?.split(' ')[0]}
                    </span>
                  </div>
                ))}
                {tarefasPendentes.length > 5 && (
                  <Link href="/tarefas" style={{ fontSize: 11, color: 'var(--accent-blue)', textDecoration: 'none', textAlign: 'center', marginTop: 8 }}>
                    +{tarefasPendentes.length - 5} tarefas pendentes
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Alertas */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={12} /> Atenção
            </div>

            {alertas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text-faint)' }}>
                ✅ Tudo em ordem!
              </div>
            ) : (
              alertas.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }} className="last:border-0">
                  <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: a.dot, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{a.sub}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Progresso dos projectos */}
        {projetosAtivos.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Projetos do mês
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {projetosAtivos.slice(0,6).map(p => (
                <Link key={p.id} href={`/projetos/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)', transition: 'border-color 0.15s', cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.clienteNome}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.progresso}%`, backgroundColor: p.progresso >= 75 ? 'var(--accent-green)' : p.progresso >= 40 ? 'var(--brand)' : 'var(--accent-amber)', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{p.progresso}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Atalhos */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={12} /> Atalhos rápidos
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {shortcuts.map(s => (
              <Link key={s.href} href={s.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, transition: 'border-color 0.15s' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: s.color }}>{s.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
