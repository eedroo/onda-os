'use client'

import { useEffect, useState } from 'react'
import { CheckSquare, Square, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clientesService, tarefasService, projetosService, type Tarefa, type Cliente, type Projeto } from '@/lib/db'

type Filtro = 'TODAS' | 'PENDENTE' | 'EM_CURSO' | 'CONCLUIDA'

const CATEGORIA_EMOJI: Record<string, string> = {
  'Google Business': '📍', 'SEO': '🔍', 'Site': '🌐',
  'Blog': '✍️', 'Relatório': '📊', 'Estratégia': '🎯',
}

export default function TarefasPage() {
  const router = useRouter()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('TODAS')
  const [clienteFiltro, setClienteFiltro] = useState('TODOS')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [c, p] = await Promise.all([clientesService.getAll(), projetosService.getAll()])
      setClientes(c); setProjetos(p)
      if (c.length) {
        const ids = c.map(x => x.id!).filter(Boolean)
        const t = await tarefasService.getByClientes(ids)
        t.sort((a, b) => (a.dataLimite || '9999').localeCompare(b.dataLimite || '9999'))
        setTarefas(t)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function toggleTarefa(tarefaId: string, statusAtual: string) {
    const novoStatus = statusAtual === 'CONCLUIDA' ? 'PENDENTE' as const : 'CONCLUIDA' as const
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t))
    await tarefasService.update(tarefaId, { status: novoStatus, concluidaEm: novoStatus === 'CONCLUIDA' ? new Date().toISOString() : undefined })
    const tarefa = tarefas.find(t => t.id === tarefaId)
    if (tarefa) {
      const pt = tarefas.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t).filter(t => t.projetoId === tarefa.projetoId)
      const conc = pt.filter(t => t.status === 'CONCLUIDA').length
      await projetosService.update(tarefa.projetoId, { progresso: Math.round((conc / pt.length) * 100) })
    }
  }

  const getNomeProjeto = (id: string) => projetos.find(p => p.id === id)?.nome || ''
  const hoje = new Date().toISOString().split('T')[0]

  const tarefasFiltradas = tarefas.filter(t => {
    if (filtro !== 'TODAS' && t.status !== filtro) return false
    if (clienteFiltro !== 'TODOS' && t.clienteId !== clienteFiltro) return false
    return true
  })

  const porCliente = clientes
    .filter(c => clienteFiltro === 'TODOS' || c.id === clienteFiltro)
    .map(c => ({ cliente: c, tarefas: tarefasFiltradas.filter(t => t.clienteId === c.id) }))
    .filter(g => g.tarefas.length > 0)

  const counts = { TODAS: tarefas.length, PENDENTE: tarefas.filter(t => t.status === 'PENDENTE').length, EM_CURSO: tarefas.filter(t => t.status === 'EM_CURSO').length, CONCLUIDA: tarefas.filter(t => t.status === 'CONCLUIDA').length }
  const labels: Record<Filtro, string> = { TODAS: 'Todas', PENDENTE: 'Pendentes', EM_CURSO: 'Em curso', CONCLUIDA: 'Concluídas' }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
          <CheckSquare size={18} style={{ color: 'var(--accent-blue)' }} /> Tarefas
        </div>
        <select value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer' }}>
          <option value="TODOS">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        {(['TODAS', 'PENDENTE', 'EM_CURSO', 'CONCLUIDA'] as Filtro[]).map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: filtro === f ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: filtro === f ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: filtro === f ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {labels[f]} <strong style={{ marginLeft: 3 }}>{counts[f]}</strong>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {tarefas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, textAlign: 'center' }}>
            <CheckSquare size={32} style={{ color: 'var(--accent-blue)', opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Sem tarefas ainda</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cria os projectos do mês para gerar as tarefas automaticamente</div>
          </div>
        ) : (
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {porCliente.map(({ cliente, tarefas: tc }) => {
              const concluidas = tc.filter(t => t.status === 'CONCLUIDA').length
              const progresso = tc.length > 0 ? Math.round((concluidas / tc.length) * 100) : 0
              const projetosIds = Array.from(new Set(tc.map(t => t.projetoId)))
              return (
                <div key={cliente.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--accent-blue)' }}>
                        {cliente.empresa.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{cliente.empresa}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{concluidas}/{tc.length}</span>
                      <div style={{ width: 50, height: 3, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progresso}%`, backgroundColor: 'var(--brand)', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--accent-blue)' }}>{progresso}%</span>
                    </div>
                  </div>
                  {projetosIds.map(projetoId => {
                    const tp = tc.filter(t => t.projetoId === projetoId)
                    return (
                      <div key={projetoId} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, paddingLeft: 2 }}>{getNomeProjeto(projetoId)}</div>
                        {tp.map(tarefa => {
                          const atrasada = tarefa.dataLimite && tarefa.dataLimite < hoje && tarefa.status !== 'CONCLUIDA'
                          const eHoje = tarefa.dataLimite === hoje && tarefa.status !== 'CONCLUIDA'
                          return (
                            <div key={tarefa.id}
                              onClick={() => router.push(`/tarefas/${tarefa.id}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 6px', borderRadius: 6, cursor: 'pointer', borderLeft: atrasada ? '2px solid var(--accent-red)' : eHoje ? '2px solid var(--brand)' : '2px solid transparent' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-input)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <button onClick={e => { e.stopPropagation(); toggleTarefa(tarefa.id!, tarefa.status) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                {tarefa.status === 'CONCLUIDA'
                                  ? <CheckSquare size={15} style={{ color: 'var(--brand)' }} />
                                  : <Square size={15} style={{ color: 'var(--text-faint)' }} />
                                }
                              </button>
                              <span style={{ fontSize: 12.5, flex: 1, color: tarefa.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
                                {tarefa.titulo}
                              </span>
                              <span style={{ fontSize: 13 }}>{CATEGORIA_EMOJI[tarefa.categoria] || '📌'}</span>
                              {tarefa.dataLimite && (
                                <span style={{ fontSize: 10, color: atrasada ? 'var(--accent-red)' : eHoje ? 'var(--brand)' : 'var(--text-faint)' }}>
                                  {atrasada ? '⚠️ ' : eHoje ? '📅 ' : ''}{tarefa.dataLimite}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {porCliente.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 13 }}>Nenhuma tarefa com este filtro</div>}
          </div>
        )}
      </div>
    </div>
  )
}
