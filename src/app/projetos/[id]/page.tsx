'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckSquare, Square, Clock, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import {
  projetosService, tarefasService, categoriasService,
  type Projeto, type Tarefa, type TarefaStatus, type Categoria, type Frequencia,
} from '@/lib/db'

const CATEGORIA_EMOJI: Record<string, string> = {
  'Google Business': '📍', 'SEO': '🔍', 'Site': '🌐',
  'Blog': '✍️', 'Relatório': '📊', 'Estratégia': '🎯',
}

const STATUS_OPTIONS: { value: TarefaStatus; label: string; color: string; bg: string }[] = [
  { value: 'PENDENTE',  label: 'Pendente',  color: 'var(--text-muted)',   bg: 'var(--pill-gray-bg)' },
  { value: 'EM_CURSO',  label: 'Em curso',  color: 'var(--accent-blue)',  bg: 'var(--pill-blue-bg)' },
  { value: 'CONCLUIDA', label: 'Concluída', color: 'var(--accent-green)', bg: 'var(--pill-green-bg)' },
  { value: 'BLOQUEADA', label: 'Bloqueada', color: 'var(--accent-red)',   bg: 'var(--pill-red-bg)' },
]

const FREQUENCIAS: Frequencia[] = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']
const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', categoria: '', frequencia: 'MENSAL' as Frequencia, dataLimite: '' })

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const [allProjetos, t, cats] = await Promise.all([
        projetosService.getAll(),
        tarefasService.getByProjeto(id),
        categoriasService.getAll(),
      ])
      setProjeto(allProjetos.find(x => x.id === id) || null)
      setTarefas(t)
      setCategoriasConfig(cats)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function recalcularProgresso(tarefasAtualizadas: Tarefa[]) {
    const concluidas = tarefasAtualizadas.filter(t => t.status === 'CONCLUIDA').length
    const progresso = tarefasAtualizadas.length > 0
      ? Math.round((concluidas / tarefasAtualizadas.length) * 100) : 0
    await projetosService.update(id, { progresso })
    setProjeto(prev => prev ? { ...prev, progresso } : null)
  }

  async function setStatus(tarefaId: string, novoStatus: TarefaStatus) {
    // 1. Actualiza UI
    const updated = tarefas.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t)
    setTarefas(updated)
    setOpenDropdown(null)
    // 2. Guarda no Firebase com método dedicado
    await tarefasService.updateStatus(tarefaId, novoStatus)
    await recalcularProgresso(updated)
  }

  async function toggleTarefa(tarefaId: string, statusAtual: TarefaStatus) {
    const novoStatus: TarefaStatus = statusAtual === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
    await setStatus(tarefaId, novoStatus)
  }

  async function updateDataLimite(tarefaId: string, data: string) {
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, dataLimite: data } : t))
    await tarefasService.update(tarefaId, { dataLimite: data || undefined })
  }

  async function adicionarTarefa() {
    if (!novaTarefa.titulo.trim() || !projeto) return
    setSalvando(true)
    try {
      const ordem = tarefas.length ? Math.max(...tarefas.map(t => t.ordem)) + 1 : 1
      const dados = {
        projetoId: id, clienteId: projeto.clienteId, titulo: novaTarefa.titulo,
        categoria: novaTarefa.categoria || 'Outros', status: 'PENDENTE' as TarefaStatus, ordem,
        frequencia: novaTarefa.frequencia, dataLimite: novaTarefa.dataLimite || undefined,
      }
      const novoId = await tarefasService.create(dados)
      const atualizadas = [...tarefas, { id: novoId, ...dados }]
      setTarefas(atualizadas)
      await recalcularProgresso(atualizadas)
      setNovaTarefa({ titulo: '', categoria: '', frequencia: 'MENSAL', dataLimite: '' })
      setShowForm(false)
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  async function removerTarefa(tarefaId: string) {
    if (!confirm('Eliminar esta tarefa?')) return
    const atualizadas = tarefas.filter(t => t.id !== tarefaId)
    setTarefas(atualizadas)
    await tarefasService.delete(tarefaId)
    await recalcularProgresso(atualizadas)
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )
  if (!projeto) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Projeto não encontrado
    </div>
  )

  const categorias = Array.from(new Set(tarefas.map(t => t.categoria)))
  const concluidas = tarefas.filter(t => t.status === 'CONCLUIDA').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}
      onClick={() => openDropdown && setOpenDropdown(null)}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '4px 8px' }}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{projeto.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{concluidas} de {tarefas.length} tarefas concluídas</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: projeto.progresso >= 75 ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
              {projeto.progresso}%
            </div>
            <div style={{ width: 80, height: 5, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${projeto.progresso}%`, backgroundColor: projeto.progresso >= 75 ? 'var(--accent-green)' : 'var(--brand)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); setShowForm(s => !s) }} className="btn btn-primary">
            <Plus size={13} /> Adicionar tarefa
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {showForm && (
            <div className="card" style={{ padding: 16 }} onClick={e => e.stopPropagation()}>
              <div className="sec-title">Nova tarefa</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Título *</label>
                  <input className="input" value={novaTarefa.titulo} onChange={e => setNovaTarefa(f => ({ ...f, titulo: e.target.value }))} placeholder="Título da tarefa" />
                </div>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <select className="select" value={novaTarefa.categoria} onChange={e => setNovaTarefa(f => ({ ...f, categoria: e.target.value }))}>
                    <option value="">Outros</option>
                    {categoriasConfig.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Frequência</label>
                  <select className="select" value={novaTarefa.frequencia} onChange={e => setNovaTarefa(f => ({ ...f, frequencia: e.target.value as Frequencia }))}>
                    {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Data limite</label>
                  <input className="input" type="date" value={novaTarefa.dataLimite} onChange={e => setNovaTarefa(f => ({ ...f, dataLimite: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
                <button type="button" disabled={salvando || !novaTarefa.titulo.trim()} onClick={adicionarTarefa} className="btn btn-primary">
                  {salvando ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
                </button>
              </div>
            </div>
          )}

          {categorias.map(cat => {
            const tc = tarefas.filter(t => t.categoria === cat)
            const concluidasCat = tc.filter(t => t.status === 'CONCLUIDA').length
            return (
              <div key={cat} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15 }}>{CATEGORIA_EMOJI[cat] || '📌'}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{cat}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{concluidasCat}/{tc.length}</span>
                  </div>
                  <div style={{ width: 50, height: 3, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${tc.length > 0 ? (concluidasCat/tc.length)*100 : 0}%`, backgroundColor: 'var(--brand)', borderRadius: 2 }} />
                  </div>
                </div>

                {tc.map(tarefa => {
                  const statusInfo = STATUS_OPTIONS.find(s => s.value === tarefa.status)
                  return (
                    <div key={tarefa.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderBottom: '1px solid var(--border-subtle)' }} className="last:border-0">

                      <button
                        onClick={e => { e.stopPropagation(); toggleTarefa(tarefa.id!, tarefa.status) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {tarefa.status === 'CONCLUIDA'
                          ? <CheckSquare size={16} style={{ color: 'var(--brand)' }} />
                          : <Square size={16} style={{ color: 'var(--text-faint)' }} />
                        }
                      </button>

                      <Link href={`/tarefas/${tarefa.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, fontSize: 13, color: tarefa.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}
                      >
                        {tarefa.titulo}
                      </Link>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }} onClick={e => e.stopPropagation()}>
                        <Clock size={11} style={{ color: 'var(--text-faint)' }} />
                        <input
                          type="date"
                          value={tarefa.dataLimite || ''}
                          onChange={e => updateDataLimite(tarefa.id!, e.target.value)}
                          style={{ fontSize: 10, color: 'var(--text-faint)', backgroundColor: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', width: 100 }}
                        />
                      </div>

                      <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === tarefa.id ? null : tarefa.id!)}
                          style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, border: `1px solid ${statusInfo?.color}`, cursor: 'pointer', backgroundColor: statusInfo?.bg, color: statusInfo?.color, fontWeight: 500, whiteSpace: 'nowrap' }}
                        >
                          {statusInfo?.label} ▾
                        </button>
                        {openDropdown === tarefa.id && (
                          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', zIndex: 100, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setStatus(tarefa.id!, opt.value) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, textAlign: 'left', border: 'none', cursor: 'pointer', backgroundColor: tarefa.status === opt.value ? opt.bg : 'transparent', color: opt.color, fontWeight: tarefa.status === opt.value ? 600 : 400 }}
                              >
                                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: opt.color, flexShrink: 0 }} />
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); removerTarefa(tarefa.id!) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2, flexShrink: 0 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
