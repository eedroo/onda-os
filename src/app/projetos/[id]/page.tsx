'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckSquare, Square, Clock, Plus, Trash2, ExternalLink, LayoutGrid, Calendar as CalendarIcon, Tag } from 'lucide-react'
import Link from 'next/link'
import {
  projetosService, tarefasService, categoriasService, clientesService,
  type Projeto, type Tarefa, type TarefaStatus, type Categoria, type Frequencia, type Cliente,
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
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Vista = 'status' | 'calendario' | 'servico'
const VISTAS: { id: Vista; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'status', label: 'Kanban — Status', icon: LayoutGrid },
  { id: 'calendario', label: 'Calendário', icon: CalendarIcon },
  { id: 'servico', label: 'Kanban — Serviço', icon: Tag },
]

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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', categoria: '', frequencia: 'MENSAL' as Frequencia, dataLimite: '' })
  const [vista, setVista] = useState<Vista>('status')

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
    setOpenDropdown(null)
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

  const links = cliente ? LINKS_FIXOS
    .filter(l => (cliente as unknown as Record<string, unknown>)[l.key])
    .map(l => ({ label: l.label, icon: l.icon, url: (cliente as unknown as Record<string, unknown>)[l.key] as string }))
    : []
  if (cliente?.instagram) links.push({ label: cliente.instagram, icon: '📸', url: `https://instagram.com/${cliente.instagram.replace('@', '')}` })
  const linksFavoritos = (cliente?.linksFavoritos || []).map(l => ({ label: l.label, icon: '⭐', url: l.url }))
  const todosLinks = [...links, ...linksFavoritos]

  // Renderiza um cartão de tarefa reutilizável entre os dois kanbans
  function renderCartao(tarefa: Tarefa, mostrarStatus: boolean) {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === tarefa.status)
    return (
      <div key={tarefa.id} className="card" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); toggleTarefa(tarefa.id!, tarefa.status) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1 }}
          >
            {tarefa.status === 'CONCLUIDA'
              ? <CheckSquare size={14} style={{ color: 'var(--brand)' }} />
              : <Square size={14} style={{ color: 'var(--text-faint)' }} />}
          </button>
          <Link href={`/tarefas/${tarefa.id}`} onClick={e => e.stopPropagation()}
            style={{ flex: 1, fontSize: 12, lineHeight: 1.3, color: tarefa.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
            {tarefa.titulo}
          </Link>
          <button onClick={e => { e.stopPropagation(); removerTarefa(tarefa.id!) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0, flexShrink: 0 }}>
            <Trash2 size={11} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{CATEGORIA_EMOJI[tarefa.categoria] || '📌'} {tarefa.categoria}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
            <Clock size={10} style={{ color: 'var(--text-faint)' }} />
            <input type="date" value={tarefa.dataLimite || ''} onChange={e => updateDataLimite(tarefa.id!, e.target.value)}
              style={{ fontSize: 9, color: 'var(--text-faint)', backgroundColor: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', width: 76 }} />
          </div>
        </div>
        {mostrarStatus && (
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpenDropdown(openDropdown === tarefa.id ? null : tarefa.id!)}
              style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, border: `1px solid ${statusInfo?.color}`, cursor: 'pointer', backgroundColor: statusInfo?.bg, color: statusInfo?.color, fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              {statusInfo?.label} ▾
            </button>
            {openDropdown === tarefa.id && (
              <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', zIndex: 100, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value}
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
        )}
      </div>
    )
  }

  function KanbanStatus() {
    return (
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {STATUS_OPTIONS.map(opt => {
          const items = tarefas.filter(t => t.status === opt.value)
          return (
            <div key={opt.value} style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderTop: `2px solid ${opt.color}`, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTopWidth: 2, borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: opt.color }}>{opt.label}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
              </div>
              {items.map(t => renderCartao(t, false))}
              {items.length === 0 && (
                <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', border: '1px dashed var(--border-subtle)', borderRadius: 8 }}>Vazio</div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function KanbanServico() {
    return (
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {categorias.map(cat => {
          const items = tarefas.filter(t => t.categoria === cat)
          return (
            <div key={cat} style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{CATEGORIA_EMOJI[cat] || '📌'} {cat}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
              </div>
              {items.map(t => renderCartao(t, true))}
              {items.length === 0 && (
                <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', border: '1px dashed var(--border-subtle)', borderRadius: 8 }}>Vazio</div>
              )}
            </div>
          )
        })}
        {categorias.length === 0 && (
          <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', width: '100%' }}>Sem tarefas ainda</div>
        )}
      </div>
    )
  }

  function CalendarioView() {
    const ano = projeto!.ano, mes = projeto!.mes
    const diasNoMes = new Date(ano, mes, 0).getDate()
    const diaSemanaInicio = new Date(ano, mes - 1, 1).getDay()

    const porDia: Record<number, Tarefa[]> = {}
    const semData: Tarefa[] = []
    tarefas.forEach(t => {
      if (t.dataLimite) {
        const [y, m, d] = t.dataLimite.split('-').map(Number)
        if (y === ano && m === mes) { porDia[d] = [...(porDia[d] || []), t]; return }
      }
      semData.push(t)
    })

    const celulas: (number | null)[] = [...Array(diaSemanaInicio).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{MESES[mes - 1]} {ano}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>
          ))}
          {celulas.map((dia, i) => (
            <div key={i} style={{
              minHeight: 74, borderRadius: 6, padding: 4,
              backgroundColor: dia ? 'var(--bg-card)' : 'transparent',
              border: dia ? '1px solid var(--border-subtle)' : 'none',
            }}>
              {dia && (
                <>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 3 }}>{dia}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(porDia[dia] || []).map(t => (
                      <div key={t.id} onClick={() => toggleTarefa(t.id!, t.status)}
                        title={t.titulo}
                        style={{
                          fontSize: 9, padding: '2px 4px', borderRadius: 3, cursor: 'pointer',
                          backgroundColor: t.status === 'CONCLUIDA' ? 'var(--pill-green-bg)' : 'var(--pill-blue-bg)',
                          color: t.status === 'CONCLUIDA' ? 'var(--accent-green)' : 'var(--accent-blue)',
                          textDecoration: t.status === 'CONCLUIDA' ? 'line-through' : 'none',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                        {t.titulo}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {semData.length > 0 && (
          <div className="card" style={{ padding: 12 }}>
            <div className="sec-title">Sem data definida ({semData.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {semData.map(t => (
                <div key={t.id} onClick={() => toggleTarefa(t.id!, t.status)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', cursor: 'pointer', fontSize: 12, color: t.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: t.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
                  {t.status === 'CONCLUIDA' ? <CheckSquare size={13} style={{ color: 'var(--brand)' }} /> : <Square size={13} style={{ color: 'var(--text-faint)' }} />}
                  {t.titulo}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

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

      {/* Tabs de vista */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        {VISTAS.map(v => {
          const Icon = v.icon
          return (
            <button key={v.id} onClick={() => setVista(v.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: vista === v.id ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: vista === v.id ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: vista === v.id ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              <Icon size={12} /> {v.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

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

          {vista === 'status' && <KanbanStatus />}
          {vista === 'servico' && <KanbanServico />}
          {vista === 'calendario' && <CalendarioView />}

        </div>
      </div>
    </div>
  )
}
