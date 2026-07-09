'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckSquare, Square, Plus, BarChart2 } from 'lucide-react'
import { projetosService, tarefasService, type Projeto, type Tarefa, type TarefaStatus } from '@/lib/db'

const CATEGORIA_COLORS: Record<string, string> = {
  'Google Business': 'pill-green',
  'SEO':             'pill-blue',
  'Site':            'pill-purple',
  'Blog':            'pill-amber',
  'Relatório':       'pill-gray',
  'Estratégia':      'pill-red',
}

const STATUS_LABELS: Record<TarefaStatus, string> = {
  PENDENTE:  'Pendente',
  EM_CURSO:  'Em curso',
  CONCLUIDA: 'Concluída',
  BLOQUEADA: 'Bloqueada',
}

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [p, t] = await Promise.all([
        projetosService.getAll().then(all => all.find(x => x.id === id) || null),
        tarefasService.getByProjeto(id),
      ])
      setProjeto(p)
      setTarefas(t)
      setLoading(false)
    }
    load()
  }, [id])

  async function toggleTarefa(tarefa: Tarefa) {
    const novoStatus: TarefaStatus = tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
    await tarefasService.update(tarefa.id!, { status: novoStatus, concluidaEm: novoStatus === 'CONCLUIDA' ? new Date().toISOString() : undefined })
    const updated = tarefas.map(t => t.id === tarefa.id ? { ...t, status: novoStatus } : t)
    setTarefas(updated)

    // Atualizar progresso do projecto
    const concluidas = updated.filter(t => t.status === 'CONCLUIDA').length
    const progresso = Math.round((concluidas / updated.length) * 100)
    await projetosService.update(id, { progresso })
    setProjeto(prev => prev ? { ...prev, progresso } : null)
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin text-accent-blue" /></div>
  if (!projeto) return <div className="flex h-full items-center justify-center text-text-muted">Projeto não encontrado</div>

  const categorias = [...new Set(tarefas.map(t => t.categoria))]
  const concluidas = tarefas.filter(t => t.status === 'CONCLUIDA').length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-bg-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn btn-ghost py-1 px-2">
            <ArrowLeft size={14} />
          </button>
          <div>
            <div className="text-[15px] font-medium text-text-primary">{projeto.nome}</div>
            <div className="text-[11px] text-text-muted">{concluidas} de {tarefas.length} tarefas concluídas</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[20px] font-medium text-accent-blue">{projeto.progresso}%</div>
          <div className="w-20 h-1.5 bg-border-subtle rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${projeto.progresso}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {categorias.map(cat => {
            const tarefasCat = tarefas.filter(t => t.categoria === cat)
            const concluidasCat = tarefasCat.filter(t => t.status === 'CONCLUIDA').length
            return (
              <div key={cat} className="card p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className={`pill ${CATEGORIA_COLORS[cat] || 'pill-gray'}`}>{cat}</span>
                    <span className="text-[11px] text-text-faint">{concluidasCat}/{tarefasCat.length}</span>
                  </div>
                  <div className="w-16 h-1 bg-border-subtle rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${(concluidasCat/tarefasCat.length)*100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  {tarefasCat.map(tarefa => (
                    <div
                      key={tarefa.id}
                      onClick={() => toggleTarefa(tarefa)}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-lg cursor-pointer hover:bg-bg-input transition-colors group"
                    >
                      {tarefa.status === 'CONCLUIDA'
                        ? <CheckSquare size={16} className="text-brand flex-shrink-0" />
                        : <Square size={16} className="text-text-faint flex-shrink-0 group-hover:text-text-muted" />
                      }
                      <span className={`text-[13px] flex-1 ${tarefa.status === 'CONCLUIDA' ? 'text-text-faint line-through' : 'text-text-secondary'}`}>
                        {tarefa.titulo}
                      </span>
                      {tarefa.frequencia && (
                        <span className="text-[9px] text-text-faint uppercase tracking-wide">{tarefa.frequencia}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {tarefas.length === 0 && (
            <div className="card p-8 text-center">
              <div className="text-[13px] text-text-muted">Sem tarefas neste projeto</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
