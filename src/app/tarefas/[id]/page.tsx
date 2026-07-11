'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckSquare, Square, Calendar, Tag, Briefcase } from 'lucide-react'
import { tarefasService, clientesService, projetosService, type Tarefa, type TarefaStatus, type Cliente, type Projeto } from '@/lib/db'

const STATUS_OPTIONS: { value: TarefaStatus; label: string; color: string; bg: string }[] = [
  { value: 'PENDENTE',  label: 'Pendente',  color: 'var(--text-muted)',   bg: 'var(--pill-gray-bg)' },
  { value: 'EM_CURSO',  label: 'Em curso',  color: 'var(--accent-blue)',  bg: 'var(--pill-blue-bg)' },
  { value: 'CONCLUIDA', label: 'Concluída', color: 'var(--accent-green)', bg: 'var(--pill-green-bg)' },
  { value: 'BLOQUEADA', label: 'Bloqueada', color: 'var(--accent-red)',   bg: 'var(--pill-red-bg)' },
]

const CATEGORIA_EMOJI: Record<string, string> = {
  'Google Business': '📍', 'SEO': '🔍', 'Site': '🌐',
  'Blog': '✍️', 'Relatório': '📊', 'Estratégia': '🎯',
}

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

  useEffect(() => {
    async function load() {
      // Busca tarefa via projecto
      const projetos = await projetosService.getAll()
      let found: Tarefa | null = null
      let foundProjeto: Projeto | null = null

      for (const p of projetos) {
        const tarefas = await tarefasService.getByProjeto(p.id!)
        const t = tarefas.find(x => x.id === id)
        if (t) { found = t; foundProjeto = p; break }
      }

      if (found) {
        setTarefa(found)
        setDescricao(found.descricao || '')
        setDataLimite(found.dataLimite || '')
        setProjeto(foundProjeto)
        if (found.clienteId) {
          const c = await clientesService.getById(found.clienteId)
          setCliente(c)
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function toggleStatus() {
    if (!tarefa) return
    const novoStatus: TarefaStatus = tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
    await tarefasService.update(id, {
      status: novoStatus,
      concluidaEm: novoStatus === 'CONCLUIDA' ? new Date().toISOString() : undefined,
    })
    setTarefa(t => t ? { ...t, status: novoStatus } : null)
  }

  async function changeStatus(status: TarefaStatus) {
    await tarefasService.update(id, {
      status,
      concluidaEm: status === 'CONCLUIDA' ? new Date().toISOString() : undefined,
    })
    setTarefa(t => t ? { ...t, status } : null)
  }

  async function save() {
    if (!tarefa) return
    setSaving(true)
    await tarefasService.update(id, { descricao, dataLimite: dataLimite || undefined })
    setTarefa(t => t ? { ...t, descricao, dataLimite } : null)
    setSaving(false)
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!tarefa) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Tarefa não encontrada</div>

  const statusInfo = STATUS_OPTIONS.find(s => s.value === tarefa.status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ArrowLeft size={14} /></button>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Detalhe da tarefa</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Header da tarefa */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div onClick={toggleStatus} style={{ cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>
                {tarefa.status === 'CONCLUIDA'
                  ? <CheckSquare size={20} style={{ color: 'var(--brand)' }} />
                  : <Square size={20} style={{ color: 'var(--text-faint)' }} />
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
                  {tarefa.titulo}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 12 }}>{CATEGORIA_EMOJI[tarefa.categoria] || '📌'} {tarefa.categoria}</span>
                  {tarefa.frequencia && <span style={{ fontSize: 10, color: 'var(--text-faint)', padding: '2px 6px', backgroundColor: 'var(--bg-input)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>{tarefa.frequencia}</span>}
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Status</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => changeStatus(opt.value)}
                    style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, border: tarefa.status === opt.value ? `2px solid ${opt.color}` : '1px solid var(--border-subtle)', cursor: 'pointer', backgroundColor: tarefa.status === opt.value ? opt.bg : 'var(--bg-input)', color: opt.color, fontWeight: tarefa.status === opt.value ? 600 : 400, transition: 'all 0.15s' }}>
                    {opt.label}
                  </button>
                ))}
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
                <Briefcase size={14} style={{ color: 'var(--text-faint)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cliente.empresa}</span>
                <span className={`pill ${cliente.plano === 'ONE' ? 'pill-green' : cliente.plano === 'PRESENCE' ? 'pill-purple' : 'pill-blue'}`} style={{ fontSize: 9 }}>{cliente.plano}</span>
              </div>
            )}
            {projeto && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={14} style={{ color: 'var(--text-faint)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{projeto.nome}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
