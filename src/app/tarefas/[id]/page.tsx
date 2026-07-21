'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckSquare, Square, Briefcase, Tag } from 'lucide-react'
import { tarefasService, clientesService, projetosService, type Tarefa, type TarefaStatus, type Cliente, type Projeto } from '@/lib/db'

const STATUS_OPTIONS: { value: TarefaStatus; label: string; color: string; bg: string }[] = [
  { value: 'PENDENTE',  label: 'Pendente',  color: 'var(--text-muted)',   bg: 'var(--pill-gray-bg)' },
  { value: 'EM_CURSO',  label: 'Em curso',  color: 'var(--accent-blue)',  bg: 'var(--pill-blue-bg)' },
  { value: 'CONCLUIDA', label: 'Concluída', color: 'var(--accent-green)', bg: 'var(--pill-green-bg)' },
  { value: 'BLOQUEADA', label: 'Bloqueada', color: 'var(--accent-red)',   bg: 'var(--pill-red-bg)' },
]

export default function TarefaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tarefa, setTarefa] = useState<Tarefa | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [dataLimite, setDataLimite] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const t = await tarefasService.getById(id)
      if (t) {
        setTarefa(t)
        setDescricao(t.descricao || '')
        setDataLimite(t.dataLimite || '')
        const [c, allProjetos] = await Promise.all([
          t.clienteId ? clientesService.getById(t.clienteId) : Promise.resolve(null),
          projetosService.getAll(),
        ])
        setCliente(c)
        setProjeto(allProjetos.find(p => p.id === t.projetoId) || null)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function changeStatus(novoStatus: TarefaStatus) {
    if (!tarefa) return
    // 1. Actualiza UI
    setTarefa(t => t ? { ...t, status: novoStatus } : null)
    // 2. Guarda com método dedicado que escreve apenas o campo status
    await tarefasService.updateStatus(id, novoStatus)
    // 3. Recalcula o progresso do projecto com base em todas as tarefas
    const tarefasProjeto = await tarefasService.getByProjeto(tarefa.projetoId)
    const atualizadas = tarefasProjeto.map(t => t.id === id ? { ...t, status: novoStatus } : t)
    const concluidas = atualizadas.filter(t => t.status === 'CONCLUIDA').length
    const progresso = atualizadas.length > 0 ? Math.round((concluidas / atualizadas.length) * 100) : 0
    await projetosService.update(tarefa.projetoId, { progresso })
    setProjeto(prev => prev ? { ...prev, progresso } : null)
  }

  async function save() {
    if (!tarefa) return
    setSaving(true)
    try {
      await tarefasService.update(id, {
        descricao: descricao || undefined,
        dataLimite: dataLimite || undefined,
      })
      setTarefa(t => t ? { ...t, descricao, dataLimite } : null)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )
  if (!tarefa) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Tarefa não encontrada
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ArrowLeft size={14} /></button>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Tarefa</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card" style={{ padding: 20 }}>
            {/* Título + toggle */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
              <button
                onClick={() => changeStatus(tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 2 }}
              >
                {tarefa.status === 'CONCLUIDA'
                  ? <CheckSquare size={22} style={{ color: 'var(--brand)' }} />
                  : <Square size={22} style={{ color: 'var(--text-faint)' }} />
                }
              </button>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
                {tarefa.titulo}
              </div>
            </div>

            {/* Status — 4 botões directos, sem dropdown */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Status</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => changeStatus(opt.value)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      border: tarefa.status === opt.value ? `2px solid ${opt.color}` : '1px solid var(--border-subtle)',
                      backgroundColor: tarefa.status === opt.value ? opt.bg : 'var(--bg-input)',
                      color: opt.color,
                      fontWeight: tarefa.status === opt.value ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-faint)' }}>
                Status actual: <strong style={{ color: STATUS_OPTIONS.find(s => s.value === tarefa.status)?.color }}>{STATUS_OPTIONS.find(s => s.value === tarefa.status)?.label}</strong>
              </div>
            </div>

            {/* Data limite */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Data limite</div>
              <input
                type="date"
                value={dataLimite}
                onChange={e => setDataLimite(e.target.value)}
                className="input"
                style={{ maxWidth: 200 }}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notas</div>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Adiciona notas sobre esta tarefa..."
              style={{ width: '100%', minHeight: 100, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--text-secondary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <button onClick={save} disabled={saving} className="btn btn-primary" style={{ marginTop: 10 }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              Guardar
            </button>
          </div>

          {/* Contexto */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Contexto</div>
            {cliente && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Briefcase size={13} style={{ color: 'var(--text-faint)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cliente.empresa}</span>
              </div>
            )}
            {projeto && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={13} style={{ color: 'var(--text-faint)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{projeto.nome}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
