'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, CheckSquare, Square, Briefcase, Tag, Layers, Flag,
  Paperclip, ListChecks, History, Plus, Trash2, ExternalLink,
} from 'lucide-react'
import {
  tarefasService, clientesService, projetosService, servicosService, categoriasService,
  type Tarefa, type TarefaStatus, type Cliente, type Projeto, type Servico, type Categoria,
  type Prioridade, type Subtarefa, type Anexo,
} from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

const STATUS_OPTIONS: { value: TarefaStatus; label: string; color: string; bg: string }[] = [
  { value: 'PENDENTE',  label: 'Pendente',  color: 'var(--text-muted)',   bg: 'var(--pill-gray-bg)' },
  { value: 'EM_CURSO',  label: 'Em curso',  color: 'var(--accent-blue)',  bg: 'var(--pill-blue-bg)' },
  { value: 'CONCLUIDA', label: 'Concluída', color: 'var(--accent-green)', bg: 'var(--pill-green-bg)' },
  { value: 'BLOQUEADA', label: 'Bloqueada', color: 'var(--accent-red)',   bg: 'var(--pill-red-bg)' },
]

const PRIORIDADE_OPTIONS: { value: Prioridade; label: string; color: string; bg: string }[] = [
  { value: 'BAIXA',   label: 'Baixa',   color: 'var(--text-muted)',   bg: 'var(--pill-gray-bg)' },
  { value: 'NORMAL',  label: 'Normal',  color: 'var(--accent-blue)',  bg: 'var(--pill-blue-bg)' },
  { value: 'ALTA',    label: 'Alta',    color: 'var(--accent-amber)', bg: 'var(--pill-amber-bg)' },
  { value: 'URGENTE', label: 'Urgente', color: 'var(--accent-red)',   bg: 'var(--pill-red-bg)' },
]

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }

function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function TarefaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tarefa, setTarefa] = useState<Tarefa | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [categoria, setCategoria] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('NORMAL')
  const [progressoManual, setProgressoManual] = useState(0)

  const [novaSubtarefa, setNovaSubtarefa] = useState('')
  const [showAnexoForm, setShowAnexoForm] = useState(false)
  const [novoAnexo, setNovoAnexo] = useState({ label: '', url: '' })

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const [t, servicosConfig, cats] = await Promise.all([
        tarefasService.getById(id), servicosService.getAll(), categoriasService.getAll(),
      ])
      setServicos(servicosConfig)
      setCategoriasConfig(cats)
      if (t) {
        setTarefa(t)
        setTitulo(t.titulo)
        setDescricao(t.descricao || '')
        setDataLimite(t.dataLimite || '')
        setDataInicio(t.dataInicio || '')
        setCategoria(t.categoria || '')
        setServicoId(t.servicoId || '')
        setPrioridade(t.prioridade || 'NORMAL')
        setProgressoManual(t.progresso || 0)
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
    setTarefa(t => t ? { ...t, status: novoStatus } : null)
    await tarefasService.updateStatus(id, novoStatus)
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
      const servico = servicos.find(s => s.id === servicoId)
      const dados = {
        titulo, descricao: descricao || undefined, dataLimite: dataLimite || undefined,
        dataInicio: dataInicio || undefined, categoria: categoria || 'Outros',
        servicoId: servico?.id, servicoNome: servico?.nome,
        prioridade,
        ...((tarefa.subtarefas && tarefa.subtarefas.length > 0) ? {} : { progresso: progressoManual }),
      }
      await tarefasService.update(id, dados)
      setTarefa(t => t ? { ...t, ...dados } : null)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function salvarSubtarefas(novas: Subtarefa[]) {
    const concluidas = novas.filter(s => s.concluida).length
    const progresso = novas.length > 0 ? Math.round((concluidas / novas.length) * 100) : progressoManual
    setTarefa(t => t ? { ...t, subtarefas: novas, progresso } : null)
    await tarefasService.update(id, { subtarefas: novas, progresso })
  }

  function adicionarSubtarefa() {
    if (!novaSubtarefa.trim() || !tarefa) return
    const novas = [...(tarefa.subtarefas || []), { id: gerarId('sub'), titulo: novaSubtarefa, concluida: false }]
    salvarSubtarefas(novas)
    setNovaSubtarefa('')
  }

  function toggleSubtarefa(subId: string) {
    if (!tarefa) return
    const novas = (tarefa.subtarefas || []).map(s => s.id === subId ? { ...s, concluida: !s.concluida } : s)
    salvarSubtarefas(novas)
  }

  function removerSubtarefa(subId: string) {
    if (!tarefa) return
    const novas = (tarefa.subtarefas || []).filter(s => s.id !== subId)
    salvarSubtarefas(novas)
  }

  async function adicionarAnexo() {
    if (!novoAnexo.label.trim() || !novoAnexo.url.trim() || !tarefa) return
    const url = /^https?:\/\//i.test(novoAnexo.url) ? novoAnexo.url : `https://${novoAnexo.url}`
    const novos: Anexo[] = [...(tarefa.anexos || []), { id: gerarId('anexo'), label: novoAnexo.label, url }]
    setTarefa(t => t ? { ...t, anexos: novos } : null)
    await tarefasService.update(id, { anexos: novos })
    setNovoAnexo({ label: '', url: '' })
    setShowAnexoForm(false)
  }

  async function removerAnexo(anexoId: string) {
    if (!tarefa) return
    const novos = (tarefa.anexos || []).filter(a => a.id !== anexoId)
    setTarefa(t => t ? { ...t, anexos: novos } : null)
    await tarefasService.update(id, { anexos: novos })
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

  const temSubtarefas = (tarefa.subtarefas || []).length > 0
  const progressoAtual = temSubtarefas
    ? Math.round(((tarefa.subtarefas || []).filter(s => s.concluida).length / (tarefa.subtarefas || []).length) * 100)
    : (tarefa.progresso || 0)
  const historico = [...(tarefa.historicoStatus || [])].sort((a, b) => b.data.localeCompare(a.data))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Tarefa" onBack={() => router.back()} />

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card" style={{ padding: 20 }}>
            {/* Título + toggle */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => changeStatus(tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 2 }}
              >
                {tarefa.status === 'CONCLUIDA'
                  ? <CheckSquare size={22} style={{ color: 'var(--brand)' }} />
                  : <Square size={22} style={{ color: 'var(--text-faint)' }} />
                }
              </button>
              <input
                value={titulo} onChange={e => setTitulo(e.target.value)}
                style={{ flex: 1, fontSize: 17, fontWeight: 500, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}
              />
            </div>

            {/* Status */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Status</label>
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
            </div>

            {/* Prioridade */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}><Flag size={10} style={{ display: 'inline', marginRight: 4 }} />Prioridade</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRIORIDADE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPrioridade(opt.value)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                      border: prioridade === opt.value ? `2px solid ${opt.color}` : '1px solid var(--border-subtle)',
                      backgroundColor: prioridade === opt.value ? opt.bg : 'var(--bg-input)',
                      color: opt.color,
                      fontWeight: prioridade === opt.value ? 700 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria + Serviço */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}><Tag size={10} style={{ display: 'inline', marginRight: 4 }} />Categoria</label>
                <select className="select" value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="">Outros</option>
                  {categoriasConfig.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}><Layers size={10} style={{ display: 'inline', marginRight: 4 }} />Serviço</label>
                <select className="select" value={servicoId} onChange={e => setServicoId(e.target.value)}>
                  <option value="">Sem serviço associado</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Datas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Data de início</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input" />
              </div>
              <div>
                <label style={labelStyle}>Data limite</label>
                <input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)} className="input" />
              </div>
            </div>

            {/* Progresso */}
            <div style={{ marginBottom: 4 }}>
              <label style={labelStyle}>Progresso {temSubtarefas && <span style={{ textTransform: 'none', letterSpacing: 0 }}>(calculado a partir das subtarefas)</span>}</label>
              {temSubtarefas ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressoAtual}%`, backgroundColor: 'var(--brand)', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>{progressoAtual}%</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="range" min={0} max={100} step={5} value={progressoManual} onChange={e => setProgressoManual(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--brand)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>{progressoManual}%</span>
                </div>
              )}
            </div>

            <button onClick={save} disabled={saving} className="btn btn-primary" style={{ marginTop: 16 }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              Guardar alterações
            </button>
          </div>

          {/* Subtarefas */}
          <div className="card" style={{ padding: 16 }}>
            <label style={labelStyle}><ListChecks size={10} style={{ display: 'inline', marginRight: 4 }} />Subtarefas</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {(tarefa.subtarefas || []).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                  <button onClick={() => toggleSubtarefa(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    {s.concluida ? <CheckSquare size={15} style={{ color: 'var(--brand)' }} /> : <Square size={15} style={{ color: 'var(--text-faint)' }} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, color: s.concluida ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: s.concluida ? 'line-through' : 'none' }}>{s.titulo}</span>
                  <button onClick={() => removerSubtarefa(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {!(tarefa.subtarefas || []).length && (
                <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '4px 0' }}>Sem subtarefas ainda</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" value={novaSubtarefa} onChange={e => setNovaSubtarefa(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && adicionarSubtarefa()}
                placeholder="Nova subtarefa..." />
              <button onClick={adicionarSubtarefa} className="btn btn-ghost"><Plus size={13} /></button>
            </div>
          </div>

          {/* Anexos */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}><Paperclip size={10} style={{ display: 'inline', marginRight: 4 }} />Anexos</label>
              <button onClick={() => setShowAnexoForm(s => !s)} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 7px' }}>
                <Plus size={10} /> Link
              </button>
            </div>
            {showAnexoForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, padding: 8, backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <input className="input" value={novoAnexo.label} onChange={e => setNovoAnexo(f => ({ ...f, label: e.target.value }))} placeholder="Nome do link" style={{ fontSize: 12 }} />
                <input className="input" value={novoAnexo.url} onChange={e => setNovoAnexo(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={{ fontSize: 12 }} />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowAnexoForm(false)} className="btn btn-ghost" style={{ fontSize: 11 }}>Cancelar</button>
                  <button onClick={adicionarAnexo} disabled={!novoAnexo.label.trim() || !novoAnexo.url.trim()} className="btn btn-primary" style={{ fontSize: 11 }}>Guardar</button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(tarefa.anexos || []).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <a href={a.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a.label} <ExternalLink size={10} style={{ color: 'var(--text-faint)' }} />
                  </a>
                  <button onClick={() => removerAnexo(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {!(tarefa.anexos || []).length && (
                <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '4px 0' }}>Sem anexos ainda</div>
              )}
            </div>
          </div>

          {/* Notas */}
          <div className="card" style={{ padding: 16 }}>
            <label style={labelStyle}>Notas</label>
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

          {/* Histórico de status */}
          {historico.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <label style={labelStyle}><History size={10} style={{ display: 'inline', marginRight: 4 }} />Histórico de status</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {historico.map((h, i) => {
                  const info = STATUS_OPTIONS.find(s => s.value === h.status)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: info?.color, flexShrink: 0 }} />
                      <span style={{ color: info?.color, fontWeight: 500 }}>{info?.label}</span>
                      <span style={{ color: 'var(--text-faint)' }}>{new Date(h.data).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Contexto */}
          <div className="card" style={{ padding: 16 }}>
            <label style={labelStyle}>Contexto</label>
            {cliente && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Briefcase size={13} style={{ color: 'var(--text-faint)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cliente.empresa}</span>
              </div>
            )}
            {projeto && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag size={13} style={{ color: 'var(--text-faint)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{projeto.nome}</span>
              </div>
            )}
            {tarefa.servicoNome && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={13} style={{ color: 'var(--text-faint)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tarefa.servicoNome}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
