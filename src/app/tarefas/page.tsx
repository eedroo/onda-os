'use client'

import { useEffect, useState } from 'react'
import { CheckSquare, Loader2 } from 'lucide-react'
import { clientesService, tarefasService, projetosService, categoriasService, type Tarefa, type Cliente, type Categoria, type TarefaStatus } from '@/lib/db'
import TarefasBoard from '@/components/tarefas/TarefasBoard'

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [clienteFiltro, setClienteFiltro] = useState('TODOS')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [c, cats] = await Promise.all([clientesService.getAll(), categoriasService.getAll()])
      setClientes(c)
      setCategoriasConfig(cats)
      if (c.length) {
        const ids = c.map(x => x.id!).filter(Boolean)
        const t = await tarefasService.getByClientes(ids)
        setTarefas(t)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function recalcularProgressoDoProjeto(tarefasAtualizadas: Tarefa[], projetoId: string) {
    const doProjeto = tarefasAtualizadas.filter(t => t.projetoId === projetoId)
    if (!doProjeto.length) return
    const conc = doProjeto.filter(t => t.status === 'CONCLUIDA').length
    await projetosService.update(projetoId, { progresso: Math.round((conc / doProjeto.length) * 100) })
  }

  async function setStatus(tarefaId: string, novoStatus: TarefaStatus) {
    const atualizadas = tarefas.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t)
    setTarefas(atualizadas)
    await tarefasService.updateStatus(tarefaId, novoStatus)
    const tarefa = tarefas.find(t => t.id === tarefaId)
    if (tarefa) await recalcularProgressoDoProjeto(atualizadas, tarefa.projetoId)
  }

  async function toggleTarefa(tarefaId: string, statusAtual: TarefaStatus) {
    await setStatus(tarefaId, statusAtual === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA')
  }

  async function updateDataLimite(tarefaId: string, data: string) {
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, dataLimite: data } : t))
    await tarefasService.update(tarefaId, { dataLimite: data || undefined })
  }

  const tarefasFiltradas = clienteFiltro === 'TODOS' ? tarefas : tarefas.filter(t => t.clienteId === clienteFiltro)
  const clienteNomePorId = Object.fromEntries(clientes.map(c => [c.id, c.empresa]))

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

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        {tarefas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, textAlign: 'center' }}>
            <CheckSquare size={32} style={{ color: 'var(--accent-blue)', opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Sem tarefas ainda</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cria os projectos do mês para gerar as tarefas automaticamente</div>
          </div>
        ) : (
          <TarefasBoard
            tarefas={tarefasFiltradas}
            categoriasConfig={categoriasConfig}
            onToggle={toggleTarefa}
            onSetStatus={setStatus}
            onUpdateDataLimite={updateDataLimite}
            clienteNomePorId={clienteFiltro === 'TODOS' ? clienteNomePorId : undefined}
          />
        )}
      </div>
    </div>
  )
}
