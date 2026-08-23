'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Plus, ExternalLink } from 'lucide-react'
import {
  projetosService, tarefasService, categoriasService, clientesService,
  type Projeto, type Tarefa, type TarefaStatus, type Categoria, type Frequencia, type Cliente,
} from '@/lib/db'
import TarefasBoard from '@/components/tarefas/TarefasBoard'
import { PageHeader } from '@/components/ui/PageHeader'

const FREQUENCIAS: Frequencia[] = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']
const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

const LINKS_FIXOS = [
  { key: 'driveUrl', label: 'Drive', icon: '📁' },
  { key: 'canvaUrl', label: 'Canva', icon: '🎨' },
  { key: 'dominioUrl', label: 'Site', icon: '🌐' },
  { key: 'whatsappUrl', label: 'WhatsApp', icon: '💬' },
]

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
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
      const p = allProjetos.find(x => x.id === id) || null
      setProjeto(p)
      setTarefas(t)
      setCategoriasConfig(cats)
      if (p) setCliente(await clientesService.getById(p.clienteId))
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
    const updated = tarefas.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t)
    setTarefas(updated)
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

  async function setCategoria(tarefaId: string, categoria: string) {
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, categoria } : t))
    await tarefasService.update(tarefaId, { categoria })
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

  async function criarTarefaInline(dados: { titulo: string; status: TarefaStatus; categoria: string; dataLimite?: string }) {
    if (!projeto) return
    const ordem = tarefas.length ? Math.max(...tarefas.map(t => t.ordem)) + 1 : 1
    const dadosTarefa = {
      projetoId: id, clienteId: projeto.clienteId, titulo: dados.titulo,
      categoria: dados.categoria || 'Outros', status: dados.status, ordem,
      dataLimite: dados.dataLimite || undefined,
    }
    const novoId = await tarefasService.create(dadosTarefa)
    const atualizadas = [...tarefas, { id: novoId, ...dadosTarefa }]
    setTarefas(atualizadas)
    await recalcularProgresso(atualizadas)
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

  const concluidas = tarefas.filter(t => t.status === 'CONCLUIDA').length

  const links = cliente ? LINKS_FIXOS
    .filter(l => (cliente as unknown as Record<string, unknown>)[l.key])
    .map(l => ({ label: l.label, icon: l.icon, url: (cliente as unknown as Record<string, unknown>)[l.key] as string }))
    : []
  if (cliente?.instagram) links.push({ label: cliente.instagram, icon: '📸', url: `https://instagram.com/${cliente.instagram.replace('@', '')}` })
  const linksFavoritos = (cliente?.linksFavoritos || []).map(l => ({ label: l.label, icon: '⭐', url: l.url }))
  const todosLinks = [...links, ...linksFavoritos]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>

      <PageHeader title={projeto.nome} subtitle={`${concluidas} de ${tarefas.length} tarefas concluídas`} onBack={() => router.back()} actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: projeto.progresso >= 75 ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
              {projeto.progresso}%
            </div>
            <div style={{ width: 80, height: 5, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${projeto.progresso}%`, backgroundColor: projeto.progresso >= 75 ? 'var(--accent-green)' : 'var(--brand)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn btn-primary">
            <Plus size={13} /> Adicionar tarefa
          </button>
        </div>
      } />

      {/* Atalhos rápidos do cliente */}
      {todosLinks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0, overflowX: 'auto' }}>
          {todosLinks.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 6, textDecoration: 'none', fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <span>{l.icon}</span>{l.label}<ExternalLink size={9} style={{ color: 'var(--text-faint)' }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

          {showForm && (
            <div className="card" style={{ padding: 16, maxWidth: 960 }}>
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

          <TarefasBoard
            tarefas={tarefas}
            categoriasConfig={categoriasConfig}
            onToggle={toggleTarefa}
            onSetStatus={setStatus}
            onSetCategoria={setCategoria}
            onUpdateDataLimite={updateDataLimite}
            onRemover={removerTarefa}
            onCriar={criarTarefaInline}
            mesInicial={projeto.mes}
            anoInicial={projeto.ano}
          />

        </div>
      </div>
    </div>
  )
}
