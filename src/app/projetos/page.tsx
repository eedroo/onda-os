'use client'

import { useEffect, useMemo, useState, Fragment } from 'react'
import { Kanban, Plus, Calendar, Loader2, Info, GanttChart, ChevronLeft, ChevronRight, ExternalLink, Sparkle } from 'lucide-react'
import Link from 'next/link'
import { projetosService, clientesService, type Projeto, type Cliente, type ProjectStatus, type Prioridade } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useKanbanDnd } from '@/components/dnd/useKanbanDnd'
import { SortableItem } from '@/components/dnd/SortableItem'
import { DroppableColumn } from '@/components/dnd/DroppableColumn'

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// 6 meses, 2 antes + o mês-âncora + 3 depois ("últimos 3 + próximos 3").
function mesesJanela(mes: number, ano: number): { mes: number; ano: number }[] {
  const janela: { mes: number; ano: number }[] = []
  for (let offset = -2; offset <= 3; offset++) {
    const total = (mes - 1) + offset
    const m = ((total % 12) + 12) % 12 + 1
    const a = ano + Math.floor(total / 12)
    janela.push({ mes: m, ano: a })
  }
  return janela
}

const PRIORIDADE_INFO: Record<Prioridade, { label: string; cor: string; bg: string }> = {
  BAIXA:   { label: 'Baixa',   cor: 'var(--text-muted)',   bg: 'var(--pill-gray-bg)' },
  NORMAL:  { label: 'Normal',  cor: 'var(--accent-blue)',  bg: 'var(--pill-blue-bg)' },
  ALTA:    { label: 'Alta',    cor: 'var(--accent-amber)', bg: 'var(--pill-amber-bg)' },
  URGENTE: { label: 'Urgente', cor: 'var(--accent-red)',   bg: 'var(--pill-red-bg)' },
}
const PRIORIDADES: Prioridade[] = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']

const COLS: { id: ProjectStatus; label: string; color: string; border: string }[] = [
  { id: 'PLANEAMENTO', label: 'Planeamento', color: 'var(--accent-blue)',   border: 'var(--accent-blue)' },
  { id: 'EXECUCAO',    label: 'Execução',    color: 'var(--accent-amber)',  border: 'var(--accent-amber)' },
  { id: 'APROVACAO',   label: 'Aprovação',   color: '#fb923c',              border: '#fb923c' },
  { id: 'ENTREGA',     label: 'Entrega',     color: 'var(--accent-purple)', border: 'var(--accent-purple)' },
  { id: 'CONCLUIDO',   label: 'Concluído',   color: 'var(--accent-green)',  border: 'var(--accent-green)' },
]

const PLANO_COLOR: Record<string, string> = { ONE: 'pill-green', PRESENCE: 'pill-purple', GROWTH: 'pill-blue' }

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [vista, setVista] = useState<'kanban' | 'timeline'>('kanban')
  const hojeRef = new Date()
  const [anchorMes, setAnchorMes] = useState(hojeRef.getMonth() + 1)
  const [anchorAno, setAnchorAno] = useState(hojeRef.getFullYear())

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [p, c] = await Promise.all([projetosService.getAll(), clientesService.getAll()])
      setProjetos(ordenarProjetos(p))
      setClientes(c)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function ordenarProjetos(lista: Projeto[]): Projeto[] {
    return [...lista].sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity))
  }

  async function moverStatus(id: string, status: ProjectStatus) {
    setProjetos(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    await projetosService.update(id, { status })
  }

  async function mudarPrioridade(id: string, prioridade: Prioridade) {
    setProjetos(prev => prev.map(p => p.id === id ? { ...p, prioridade } : p))
    await projetosService.update(id, { prioridade })
  }

  async function mudarProgresso(id: string, progresso: number) {
    setProjetos(prev => prev.map(p => p.id === id ? { ...p, progresso } : p))
    await projetosService.update(id, { progresso })
  }

  function deslocarAncora(delta: number) {
    const total = (anchorMes - 1) + delta
    const m = ((total % 12) + 12) % 12 + 1
    const a = anchorAno + Math.floor(total / 12)
    setAnchorMes(m); setAnchorAno(a)
  }

  function irParaHoje() {
    const h = new Date()
    setAnchorMes(h.getMonth() + 1); setAnchorAno(h.getFullYear())
  }

  async function reordenarProjetos(idsOrdenados: string[]) {
    setProjetos(prev => {
      const porId = Object.fromEntries(prev.map(p => [p.id, p]))
      const reordenados = idsOrdenados.map((id, i) => ({ ...porId[id], ordem: i + 1 }))
      const outros = prev.filter(p => !idsOrdenados.includes(p.id!))
      return [...reordenados, ...outros]
    })
    await projetosService.reordenar(idsOrdenados)
  }

  async function criarMensais() {
    setCriando(true)
    setFeedback(null)
    try {
      const mes = new Date().getMonth() + 1
      const ano = new Date().getFullYear()
      const ativos = clientes.filter(c => c.status === 'ATIVO')
      const inactivos = clientes.length - ativos.length
      let criados = 0
      let jaExistiam = 0
      for (const c of ativos) {
        const existe = projetos.find(p => p.clienteId === c.id && p.mes === mes && p.ano === ano)
        if (existe) { jaExistiam++; continue }
        await projetosService.criarMensal(c, mes, ano)
        criados++
      }
      await load()
      if (ativos.length === 0) {
        setFeedback('Nenhum cliente está "Ativo" — muda o estado do cliente para gerar o projecto mensal.')
      } else if (criados === 0) {
        setFeedback(`Nenhum projecto novo criado — os ${jaExistiam} cliente(s) activo(s) já tinham projecto este mês.${inactivos > 0 ? ` (${inactivos} cliente(s) não activo(s) foram ignorados.)` : ''}`)
      } else {
        setFeedback(`${criados} projecto(s) criado(s)${jaExistiam > 0 ? `, ${jaExistiam} já existiam` : ''}.`)
      }
    } catch (e) {
      console.error(e)
      setFeedback('Ocorreu um erro ao criar os projectos. Tenta novamente.')
    } finally {
      setCriando(false)
    }
  }

  const colunas = useMemo(() => COLS.map(c => c.id), [])
  const { grupos, activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useKanbanDnd<Projeto>({
    itens: projetos, colunas,
    getId: p => p.id!,
    getColuna: p => p.status,
    onMudarColuna: (id, novoStatus) => moverStatus(id, novoStatus as ProjectStatus),
    onReordenar: (_coluna, ids) => reordenarProjetos(ids),
  })
  const projetoAtivo = activeId ? projetos.find(p => p.id === activeId) : null

  function renderCartao(p: Projeto) {
    return (
      <Link href={`/projetos/${p.id}`} style={{ textDecoration: 'none' }}>
        <div className="card" style={{ padding: 12, cursor: 'pointer', transition: 'border-color 0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.nome}</div>
            <span className={`pill ${PLANO_COLOR[p.clientePlano]}`} style={{ fontSize: 9, flexShrink: 0 }}>{p.clientePlano}</span>
          </div>
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>
              <span>Progresso</span><span>{p.progresso}%</span>
            </div>
            <div style={{ height: 3, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${p.progresso}%`, backgroundColor: 'var(--brand)', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--accent-blue)', textAlign: 'right', marginTop: 4 }}>Ver tarefas →</div>
        </div>
      </Link>
    )
  }

  function TimelineView() {
    const [openPill, setOpenPill] = useState<string | null>(null)
    const [editandoProgresso, setEditandoProgresso] = useState<string | null>(null)
    const [progressoTemp, setProgressoTemp] = useState('')

    const janela = mesesJanela(anchorMes, anchorAno)
    const chaveJanela = new Set(janela.map(j => `${j.ano}-${j.mes}`))
    const projetosNaJanela = projetos
      .filter(p => chaveJanela.has(`${p.ano}-${p.mes}`))
      .sort((a, b) => (a.ano * 12 + a.mes) - (b.ano * 12 + b.mes) || a.nome.localeCompare(b.nome))

    function iniciarEdicaoProgresso(p: Projeto) {
      setProgressoTemp(String(p.progresso))
      setEditandoProgresso(p.id!)
      setOpenPill(null)
    }

    function confirmarProgresso(id: string) {
      const n = Math.max(0, Math.min(100, Number(progressoTemp) || 0))
      mudarProgresso(id, n)
      setEditandoProgresso(null)
    }

    return (
      <div onClick={() => setOpenPill(null)} style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => deslocarAncora(-1)} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronLeft size={13} /></button>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 170, textAlign: 'center' }}>
            {MESES_ABREV[janela[0].mes - 1]} {janela[0].ano} – {MESES_ABREV[janela[5].mes - 1]} {janela[5].ano}
          </div>
          <button onClick={() => deslocarAncora(1)} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronRight size={13} /></button>
          <button onClick={irParaHoje} className="btn btn-ghost" style={{ fontSize: 11 }}>Hoje</button>
        </div>

        {projetosNaJanela.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 13 }}>Sem projetos neste período</div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) repeat(6, minmax(92px, 1fr))', minWidth: 760 }}>
              <div />
              {janela.map((j, i) => (
                <div key={i} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                  {MESES_ABREV[j.mes - 1]} {j.ano}
                </div>
              ))}

              {projetosNaJanela.map(p => {
                const colStatus = COLS.find(c => c.id === p.status)!
                const prio = PRIORIDADE_INFO[p.prioridade || 'NORMAL']
                return (
                  <Fragment key={p.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', borderTop: '1px solid var(--border-subtle)', borderLeft: '1px solid var(--border-subtle)', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, position: 'relative' }}>
                        <button onClick={e => { e.stopPropagation(); setOpenPill(openPill === `${p.id}:prioridade` ? null : `${p.id}:prioridade`) }}
                          title="Mudar prioridade" style={{ flexShrink: 0, display: 'flex' }}>
                          <Sparkle size={13} style={{ color: prio.cor }} fill={prio.cor} />
                        </button>
                        <Link href={`/projetos/${p.id}`} style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</Link>
                        {openPill === `${p.id}:prioridade` && (
                          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', zIndex: 100, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                            {PRIORIDADES.map(opt => (
                              <button key={opt} onMouseDown={e => { e.preventDefault(); mudarPrioridade(p.id!, opt); setOpenPill(null) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, textAlign: 'left', border: 'none', cursor: 'pointer', backgroundColor: p.prioridade === opt ? PRIORIDADE_INFO[opt].bg : 'transparent', color: PRIORIDADE_INFO[opt].cor, fontWeight: p.prioridade === opt ? 600 : 400 }}>
                                <Sparkle size={11} style={{ color: PRIORIDADE_INFO[opt].cor }} fill={PRIORIDADE_INFO[opt].cor} /> {PRIORIDADE_INFO[opt].label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--text-faint)', minWidth: 0 }}>
                        <Link href={`/clientes/${p.clienteId}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-faint)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.clienteNome} <ExternalLink size={9} style={{ flexShrink: 0 }} />
                        </Link>
                        {editandoProgresso === p.id ? (
                          <input autoFocus type="number" min={0} max={100} value={progressoTemp}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setProgressoTemp(e.target.value)}
                            onBlur={() => confirmarProgresso(p.id!)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmarProgresso(p.id!); if (e.key === 'Escape') setEditandoProgresso(null) }}
                            style={{ width: 42, fontSize: 10, padding: '1px 4px', border: '1px solid var(--border-strong)', borderRadius: 4, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }} />
                        ) : (
                          <button onClick={e => { e.stopPropagation(); iniciarEdicaoProgresso(p) }}
                            style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 8, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', cursor: 'pointer', flexShrink: 0 }}>
                            {p.progresso}%
                          </button>
                        )}
                      </div>
                    </div>
                    {janela.map((j, i) => (
                      <div key={`${p.id}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', borderTop: '1px solid var(--border-subtle)', borderLeft: '1px solid var(--border-subtle)', position: 'relative' }}>
                        {j.mes === p.mes && j.ano === p.ano && (
                          <>
                            <button onClick={e => { e.stopPropagation(); setOpenPill(openPill === `${p.id}:status` ? null : `${p.id}:status`) }}
                              style={{ padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${colStatus.border}`, backgroundColor: `color-mix(in srgb, ${colStatus.color} 15%, transparent)`, color: colStatus.color }}>
                              {colStatus.label}
                            </button>
                            {openPill === `${p.id}:status` && (
                              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', marginTop: 4, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', zIndex: 100, minWidth: 130, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                                {COLS.map(opt => (
                                  <button key={opt.id} onMouseDown={e => { e.preventDefault(); moverStatus(p.id!, opt.id); setOpenPill(null) }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, textAlign: 'left', border: 'none', cursor: 'pointer', backgroundColor: p.status === opt.id ? `color-mix(in srgb, ${opt.color} 15%, transparent)` : 'transparent', color: opt.color, fontWeight: p.status === opt.id ? 600 : 400 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: opt.color, flexShrink: 0 }} />
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </Fragment>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Projetos" icon={Kanban} actions={<>
        <button onClick={criarMensais} disabled={criando} className="btn btn-ghost">
          {criando ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
          Criar projetos do mês
        </button>
        <Link href="/projetos/novo" className="btn btn-primary"><Plus size={13} /> Novo projeto</Link>
      </>} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
        <span>Ativos <strong style={{ color: 'var(--accent-blue)', marginLeft: 4 }}>{projetos.filter(p => p.status !== 'CONCLUIDO').length}</strong></span>
        <span>Concluídos <strong style={{ color: 'var(--accent-green)', marginLeft: 4 }}>{projetos.filter(p => p.status === 'CONCLUIDO').length}</strong></span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button onClick={() => setVista('kanban')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: vista === 'kanban' ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: vista === 'kanban' ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: vista === 'kanban' ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            <Kanban size={12} /> Kanban
          </button>
          <button onClick={() => setVista('timeline')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: vista === 'timeline' ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: vista === 'timeline' ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: vista === 'timeline' ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            <GanttChart size={12} /> Timeline
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{ margin: '10px 20px 0', padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--pill-blue-bg)', color: 'var(--accent-blue)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Info size={13} /> {feedback}
        </div>
      )}

      {projetos.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center' }}>
          <Kanban size={32} style={{ color: 'var(--accent-blue)', opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Sem projetos ainda</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Adiciona clientes primeiro, depois clica em "Criar projetos do mês"</div>
          <button onClick={criarMensais} disabled={criando} className="btn btn-primary" style={{ marginTop: 4 }}>
            {criando ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
            Criar projetos do mês
          </button>
        </div>
      ) : vista === 'timeline' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <TimelineView />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {COLS.map(col => {
                const items = grupos[col.id] || []
                return (
                  <DroppableColumn key={col.id} id={col.id} items={items.map(p => p.id!)}>
                    {isOver => (
                      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="card" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px',
                          borderTop: `2px solid ${col.border}`,
                          borderRight: `1px ${isOver ? 'dashed' : 'solid'} ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`,
                          borderBottom: `1px ${isOver ? 'dashed' : 'solid'} ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`,
                          borderLeft: `1px ${isOver ? 'dashed' : 'solid'} ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>{col.label}</span>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
                        </div>
                        {items.map(p => (
                          <SortableItem key={p.id} id={p.id!}>{renderCartao(p)}</SortableItem>
                        ))}
                        {items.length === 0 && (
                          <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 11, color: isOver ? 'var(--accent-blue)' : 'var(--text-faint)', border: `1px dashed ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`, borderRadius: 8 }}>{isOver ? 'Largar aqui' : 'Vazio'}</div>
                        )}
                      </div>
                    )}
                  </DroppableColumn>
                )
              })}
            </div>
            <DragOverlay>{projetoAtivo ? <div style={{ width: 220 }}>{renderCartao(projetoAtivo)}</div> : null}</DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  )
}
