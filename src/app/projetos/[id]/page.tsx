'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckSquare, Square, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { projetosService, tarefasService, type Projeto, type Tarefa, type TarefaStatus } from '@/lib/db'

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

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStatus, setEditingStatus] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [all, t] = await Promise.all([
        projetosService.getAll(),
        tarefasService.getByProjeto(id),
      ])
      setProjeto(all.find(x => x.id === id) || null)
      setTarefas(t)
      setLoading(false)
    }
    load()
  }, [id])

  async function updateProgresso(tarefasAtualizadas: Tarefa[]) {
    const concluidas = tarefasAtualizadas.filter(t => t.status === 'CONCLUIDA').length
    const progresso = tarefasAtualizadas.length > 0
      ? Math.round((concluidas / tarefasAtualizadas.length) * 100)
      : 0
    await projetosService.update(id, { progresso })
    setProjeto(prev => prev ? { ...prev, progresso } : null)
  }

  async function toggleTarefa(tarefa: Tarefa) {
    // Toggle entre PENDENTE e CONCLUIDA
    const novoStatus: TarefaStatus = tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
    await tarefasService.update(tarefa.id!, {
      status: novoStatus,
      concluidaEm: novoStatus === 'CONCLUIDA' ? new Date().toISOString() : undefined,
    })
    const updated = tarefas.map(t => t.id === tarefa.id ? { ...t, status: novoStatus } : t)
    setTarefas(updated)
    await updateProgresso(updated)
  }

  async function changeStatus(tarefa: Tarefa, status: TarefaStatus) {
    await tarefasService.update(tarefa.id!, {
      status,
      concluidaEm: status === 'CONCLUIDA' ? new Date().toISOString() : undefined,
    })
    const updated = tarefas.map(t => t.id === tarefa.id ? { ...t, status } : t)
    setTarefas(updated)
    await updateProgresso(updated)
    setEditingStatus(null)
  }

  async function updateDataLimite(tarefa: Tarefa, data: string) {
    await tarefasService.update(tarefa.id!, { dataLimite: data })
    setTarefas(prev => prev.map(t => t.id === tarefa.id ? { ...t, dataLimite: data } : t))
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!projeto) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Projeto não encontrado</div>

  const categorias = Array.from(new Set(tarefas.map(t => t.categoria)))
  const concluidas = tarefas.filter(t => t.status === 'CONCLUIDA').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ArrowLeft size={14} /></button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{projeto.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{concluidas} de {tarefas.length} tarefas concluídas</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-blue)' }}>{projeto.progresso}%</div>
          <div style={{ width: 80, height: 5, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${projeto.progresso}%`, backgroundColor: projeto.progresso >= 75 ? 'var(--accent-green)' : 'var(--brand)', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {categorias.map(cat => {
            const tarefasCat = tarefas.filter(t => t.categoria === cat)
            const concluidasCat = tarefasCat.filter(t => t.status === 'CONCLUIDA').length
            return (
              <div key={cat} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 16 }}>{CATEGORIA_EMOJI[cat] || '📌'}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{cat}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{concluidasCat}/{tarefasCat.length}</span>
                  </div>
                  <div style={{ width: 50, height: 3, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(concluidasCat/tarefasCat.length)*100}%`, backgroundColor: 'var(--brand)', borderRadius: 2 }} />
                  </div>
                </div>

                {tarefasCat.map(tarefa => {
                  const statusInfo = STATUS_OPTIONS.find(s => s.value === tarefa.status)
                  return (
                    <div key={tarefa.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border-subtle)' }} className="last:border-0">

                      {/* Checkbox toggle */}
                      <div onClick={() => toggleTarefa(tarefa)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                        {tarefa.status === 'CONCLUIDA'
                          ? <CheckSquare size={16} style={{ color: 'var(--brand)' }} />
                          : <Square size={16} style={{ color: 'var(--text-faint)' }} />
                        }
                      </div>

                      {/* Título */}
                      <span style={{ fontSize: 13, flex: 1, color: tarefa.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
                        {tarefa.titulo}
                      </span>

                      {/* Data limite */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} style={{ color: 'var(--text-faint)' }} />
                        <input
                          type="date"
                          value={tarefa.dataLimite || ''}
                          onChange={e => updateDataLimite(tarefa, e.target.value)}
                          style={{ fontSize: 10, color: 'var(--text-faint)', backgroundColor: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', width: 90 }}
                        />
                      </div>

                      {/* Status selector */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setEditingStatus(editingStatus === tarefa.id ? null : tarefa.id!)}
                          style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, border: 'none', cursor: 'pointer', backgroundColor: statusInfo?.bg, color: statusInfo?.color, fontWeight: 500 }}
                        >
                          {statusInfo?.label}
                        </button>
                        {editingStatus === tarefa.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden', zIndex: 10, minWidth: 110, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => changeStatus(tarefa, opt.value)}
                                style={{ display: 'block', width: '100%', padding: '7px 12px', fontSize: 11, textAlign: 'left', border: 'none', cursor: 'pointer', backgroundColor: tarefa.status === opt.value ? 'var(--bg-input)' : 'transparent', color: opt.color, fontWeight: tarefa.status === opt.value ? 600 : 400 }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {tarefas.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sem tarefas neste projeto</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
