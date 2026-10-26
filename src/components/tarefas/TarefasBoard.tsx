'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckSquare, Square, Clock, Trash2, LayoutGrid, Calendar as CalendarIcon, CalendarDays, Tag, ChevronLeft, ChevronRight, Plus, Sparkle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import type { Tarefa, TarefaStatus, Categoria } from '@/lib/db'
import { useKanbanDnd } from '@/components/dnd/useKanbanDnd'
import { SortableItem } from '@/components/dnd/SortableItem'
import { DroppableColumn } from '@/components/dnd/DroppableColumn'
import { DatePicker } from '@/components/ui/DatePicker'

interface NovaTarefaDados { titulo: string; status: TarefaStatus; categoria: string; dataLimite?: string }

export const CATEGORIA_EMOJI: Record<string, string> = {
  'Google Business': '📍', 'SEO': '🔍', 'Site': '🌐',
  'Blog': '✍️', 'Relatório': '📊', 'Estratégia': '🎯',
}

// Estrela de 4 pontas — só aparece nas tarefas de prioridade alta/urgente,
// como acento visual rápido de reconhecer no board.
const PRIORIDADE_COR: Partial<Record<string, string>> = {
  ALTA: 'var(--accent-amber)', URGENTE: 'var(--accent-red)',
}

export const STATUS_OPTIONS: { value: TarefaStatus; label: string; color: string; bg: string }[] = [
  { value: 'PENDENTE',  label: 'Pendente',  color: 'var(--text-muted)',   bg: 'var(--pill-gray-bg)' },
  { value: 'EM_CURSO',  label: 'Em curso',  color: 'var(--accent-blue)',  bg: 'var(--pill-blue-bg)' },
  { value: 'CONCLUIDA', label: 'Concluída', color: 'var(--accent-green)', bg: 'var(--pill-green-bg)' },
  { value: 'BLOQUEADA', label: 'Bloqueada', color: 'var(--accent-red)',   bg: 'var(--pill-red-bg)' },
]

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const NOMES_DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

type Vista = 'status' | 'calendario' | 'categoria' | 'semana'
const VISTAS: { id: Vista; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'status', label: 'Status', icon: LayoutGrid },
  { id: 'semana', label: 'Semana', icon: CalendarDays },
  { id: 'calendario', label: 'Calendário', icon: CalendarIcon },
  { id: 'categoria', label: 'Categoria', icon: Tag },
]

type DirecaoData = 'asc' | 'desc'

// Ordena tarefas por data-limite (sem data fica sempre no fim), para os
// botões "Ordenar por data" nos kanbans de Status e Categoria. Pré-ordenar
// o array de entrada do useKanbanDnd é suficiente — o hook preserva a
// ordem de inserção ao agrupar por coluna.
function compararPorData(a: Tarefa, b: Tarefa, direcao: DirecaoData): number {
  if (!a.dataLimite && !b.dataLimite) return 0
  if (!a.dataLimite) return 1
  if (!b.dataLimite) return -1
  return direcao === 'asc' ? a.dataLimite.localeCompare(b.dataLimite) : b.dataLimite.localeCompare(a.dataLimite)
}

// Segunda-feira da semana que contém `data`.
function inicioSemana(data: Date): Date {
  const d = new Date(data)
  const dia = d.getDay()
  const deslocamento = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + deslocamento)
  d.setHours(0, 0, 0, 0)
  return d
}

interface TarefasBoardProps {
  tarefas: Tarefa[]
  categoriasConfig: Categoria[]
  onToggle: (id: string, statusAtual: TarefaStatus) => void
  onSetStatus: (id: string, novo: TarefaStatus) => void
  onSetCategoria?: (id: string, categoria: string) => void
  onUpdateDataLimite: (id: string, data: string) => void
  onRemover?: (id: string) => void
  onCriar?: (dados: NovaTarefaDados) => void | Promise<void>
  onReordenar?: (idsOrdenados: string[]) => void
  // Duplica a tarefa `origemId` com data-limite `novaData` — usado ao
  // arrastar segurando Alt no calendário. Sem isto, Alt+arrastar comporta-se
  // como um arrastar normal (move em vez de duplicar).
  onDuplicar?: (origemId: string, novaData: string) => void
  clienteNomePorId?: Record<string, string>
  mesInicial?: number
  anoInicial?: number
}

export default function TarefasBoard({
  tarefas, categoriasConfig, onToggle, onSetStatus, onSetCategoria, onUpdateDataLimite, onRemover, onCriar, onReordenar, onDuplicar, clienteNomePorId,
  mesInicial, anoInicial,
}: TarefasBoardProps) {
  const [vista, setVista] = useState<Vista>('status')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [criandoChave, setCriandoChave] = useState<string | null>(null)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [ordenacaoData, setOrdenacaoData] = useState<DirecaoData | null>(null)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const altAtivoRef = useRef(false)
  const hoje = new Date()
  const [mes, setMes] = useState(mesInicial ?? hoje.getMonth() + 1)
  const [ano, setAno] = useState(anoInicial ?? hoje.getFullYear())

  function cicloOrdenacaoData() {
    setOrdenacaoData(d => d === null ? 'asc' : d === 'asc' ? 'desc' : null)
  }

  // Segue o estado da tecla Alt num ref (não em state) para não re-renderizar
  // a cada keydown/keyup — só é lido no momento em que um drag termina.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Alt') altAtivoRef.current = true }
    function onKeyUp(e: KeyboardEvent) { if (e.key === 'Alt') altAtivoRef.current = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  function abrirCriacao(chave: string) { setCriandoChave(chave); setNovoTitulo('') }
  function cancelarCriacao() { setCriandoChave(null); setNovoTitulo('') }
  async function submeterCriacao(extra: { status: TarefaStatus; categoria: string; dataLimite?: string }) {
    if (!onCriar || !novoTitulo.trim()) return
    await onCriar({ titulo: novoTitulo.trim(), ...extra })
    setCriandoChave(null)
    setNovoTitulo('')
  }

  function renderAdicionar(chave: string, extra: { status: TarefaStatus; categoria: string; dataLimite?: string }) {
    if (!onCriar) return null
    if (criandoChave === chave) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} onClick={e => e.stopPropagation()}>
          <input autoFocus className="input" style={{ fontSize: 11, padding: '5px 8px' }} placeholder="Título da tarefa"
            value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submeterCriacao(extra); if (e.key === 'Escape') cancelarCriacao() }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => submeterCriacao(extra)} disabled={!novoTitulo.trim()} className="btn btn-primary" style={{ fontSize: 10, padding: '3px 8px', flex: 1, justifyContent: 'center' }}>Adicionar</button>
            <button onClick={cancelarCriacao} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}>×</button>
          </div>
        </div>
      )
    }
    return (
      <button onClick={e => { e.stopPropagation(); abrirCriacao(chave) }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 8px', fontSize: 11, color: 'var(--text-faint)', backgroundColor: 'transparent', border: '1px dashed var(--border-subtle)', borderRadius: 6, cursor: 'pointer', width: '100%' }}>
        <Plus size={11} /> Adicionar tarefa
      </button>
    )
  }

  function renderCartao(tarefa: Tarefa, mostrarStatus: boolean) {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === tarefa.status)
    const corPrioridade = tarefa.prioridade ? PRIORIDADE_COR[tarefa.prioridade] : undefined
    return (
      <div className="card"
        style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <button onClick={() => onToggle(tarefa.id!, tarefa.status)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1 }}>
            {tarefa.status === 'CONCLUIDA' ? <CheckSquare size={14} style={{ color: 'var(--brand)' }} /> : <Square size={14} style={{ color: 'var(--text-faint)' }} />}
          </button>
          <Link href={`/tarefas/${tarefa.id}`} style={{ flex: 1, fontSize: 12, lineHeight: 1.3, color: tarefa.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
            {tarefa.titulo}
          </Link>
          {corPrioridade && (
            <span title={`Prioridade ${tarefa.prioridade?.toLowerCase()}`} style={{ display: 'flex', flexShrink: 0, marginTop: 1 }}>
              <Sparkle size={12} style={{ color: corPrioridade }} fill={corPrioridade} />
            </span>
          )}
          {onRemover && (
            <button onClick={() => onRemover(tarefa.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0, flexShrink: 0 }}>
              <Trash2 size={11} />
            </button>
          )}
        </div>
        {typeof tarefa.progresso === 'number' && (
          <div style={{ height: 3, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${tarefa.progresso}%`, backgroundColor: tarefa.progresso >= 100 ? 'var(--accent-green)' : 'var(--brand)', borderRadius: 2, transition: 'width 0.2s' }} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{CATEGORIA_EMOJI[tarefa.categoria] || '📌'} {tarefa.categoria}</span>
          {clienteNomePorId && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, backgroundColor: 'var(--bg-input)', color: 'var(--text-faint)' }}>{clienteNomePorId[tarefa.clienteId] || ''}</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onPointerDown={e => e.stopPropagation()}>
            <Clock size={10} style={{ color: 'var(--text-faint)' }} />
            <DatePicker value={tarefa.dataLimite} onChange={v => onUpdateDataLimite(tarefa.id!, v)} compact />
          </div>
        </div>
        {mostrarStatus && (
          <div style={{ position: 'relative' }} onPointerDown={e => e.stopPropagation()}>
            <button onClick={() => setOpenDropdown(openDropdown === tarefa.id ? null : tarefa.id!)}
              style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, border: `1px solid ${statusInfo?.color}`, cursor: 'pointer', backgroundColor: statusInfo?.bg, color: statusInfo?.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {statusInfo?.label} ▾
            </button>
            {openDropdown === tarefa.id && (
              <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', zIndex: 100, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value}
                    onMouseDown={e => { e.preventDefault(); onSetStatus(tarefa.id!, opt.value); setOpenDropdown(null) }}
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

  function colunaEstilo(cor: string, emFoco: boolean) {
    const borderCor = emFoco ? 'var(--brand)' : 'var(--border-subtle)'
    const borderEstilo = emFoco ? 'dashed' : 'solid'
    return {
      display: 'flex', alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: '6px 10px', backgroundColor: 'var(--bg-card)', borderRadius: 8,
      borderTop: `2px solid ${cor}`, borderRight: `1px ${borderEstilo} ${borderCor}`, borderBottom: `1px ${borderEstilo} ${borderCor}`, borderLeft: `1px ${borderEstilo} ${borderCor}`,
    }
  }

  function KanbanStatus() {
    const colunas = STATUS_OPTIONS.map(o => o.value)
    const itensOrdenados = ordenacaoData ? [...tarefas].sort((a, b) => compararPorData(a, b, ordenacaoData)) : tarefas
    const { grupos, activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useKanbanDnd<Tarefa>({
      itens: itensOrdenados, colunas,
      getId: t => t.id!,
      getColuna: t => t.status,
      onMudarColuna: (id, novoStatus) => onSetStatus(id, novoStatus as TarefaStatus),
      onReordenar: (_coluna, ids) => onReordenar?.(ids),
    })
    const tarefaAtiva = activeId ? tarefas.find(t => t.id === activeId) : null

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, minWidth: 0, width: '100%' }}>
          {STATUS_OPTIONS.map(opt => {
            const items = grupos[opt.value] || []
            return (
              <DroppableColumn key={opt.value} id={opt.value} items={items.map(t => t.id!)}>
                {isOver => (
                  <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={colunaEstilo(opt.color, isOver)}>
                      <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: opt.color }}>{opt.label}</span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
                    </div>
                    {items.map(t => (
                      <SortableItem key={t.id} id={t.id!}>{renderCartao(t, false)}</SortableItem>
                    ))}
                    {items.length === 0 && (
                      <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: isOver ? 'var(--accent-blue)' : 'var(--text-faint)', border: `1px dashed ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`, borderRadius: 8 }}>{isOver ? 'Largar aqui' : 'Vazio'}</div>
                    )}
                    {renderAdicionar(`status-${opt.value}`, { status: opt.value, categoria: '' })}
                  </div>
                )}
              </DroppableColumn>
            )
          })}
        </div>
        <DragOverlay>{tarefaAtiva ? <div style={{ width: 240 }}>{renderCartao(tarefaAtiva, false)}</div> : null}</DragOverlay>
      </DndContext>
    )
  }

  function KanbanCategoria() {
    const nomesConfigurados = categoriasConfig.map(c => c.nome)
    const colunas = [...nomesConfigurados, '__nenhuma__']
    const itensOrdenados = ordenacaoData ? [...tarefas].sort((a, b) => compararPorData(a, b, ordenacaoData)) : tarefas
    const { grupos, activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useKanbanDnd<Tarefa>({
      itens: itensOrdenados, colunas,
      getId: t => t.id!,
      getColuna: t => nomesConfigurados.includes(t.categoria) ? t.categoria : '__nenhuma__',
      onMudarColuna: onSetCategoria ? (id, novaCategoria) => onSetCategoria(id, novaCategoria === '__nenhuma__' ? '' : novaCategoria) : undefined,
    })
    const tarefaAtiva = activeId ? tarefas.find(t => t.id === activeId) : null
    const semCategoria = grupos['__nenhuma__'] || []

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, minWidth: 0, width: '100%' }}>
          {categoriasConfig.map(cat => {
            const items = grupos[cat.nome] || []
            return (
              <DroppableColumn key={cat.id} id={cat.nome} items={items.map(t => t.id!)}>
                {isOver => (
                  <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: isOver ? '1px dashed var(--brand)' : '1px solid var(--border-subtle)', borderRadius: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{CATEGORIA_EMOJI[cat.nome] || '📌'} {cat.nome}</span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
                    </div>
                    {items.map(t => (
                      <SortableItem key={t.id} id={t.id!} disabled={!onSetCategoria}>{renderCartao(t, true)}</SortableItem>
                    ))}
                    {items.length === 0 && (
                      <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: isOver ? 'var(--accent-blue)' : 'var(--text-faint)', border: `1px dashed ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`, borderRadius: 8 }}>{isOver ? 'Largar aqui' : 'Vazio'}</div>
                    )}
                    {renderAdicionar(`cria-cat-${cat.id}`, { status: 'PENDENTE', categoria: cat.nome })}
                  </div>
                )}
              </DroppableColumn>
            )
          })}
          {(semCategoria.length > 0 || onCriar) && (
            <DroppableColumn id="__nenhuma__" items={semCategoria.map(t => t.id!)}>
              {isOver => (
                <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: isOver ? '1px dashed var(--brand)' : '1px solid var(--border-subtle)', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)' }}>📌 Sem categoria</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{semCategoria.length}</span>
                  </div>
                  {semCategoria.map(t => (
                    <SortableItem key={t.id} id={t.id!} disabled={!onSetCategoria}>{renderCartao(t, true)}</SortableItem>
                  ))}
                  {renderAdicionar('cria-cat-nenhuma', { status: 'PENDENTE', categoria: '' })}
                </div>
              )}
            </DroppableColumn>
          )}
          {categoriasConfig.length === 0 && semCategoria.length === 0 && !onCriar && (
            <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', width: '100%' }}>Sem categorias configuradas</div>
          )}
        </div>
        <DragOverlay>{tarefaAtiva ? <div style={{ width: 240 }}>{renderCartao(tarefaAtiva, true)}</div> : null}</DragOverlay>
      </DndContext>
    )
  }

  function KanbanSemana() {
    const segunda = inicioSemana(new Date())
    segunda.setDate(segunda.getDate() + semanaOffset * 7)
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(segunda)
      d.setDate(d.getDate() + i)
      return d
    })
    const colunas = dias.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

    const itensOrdenados = ordenacaoData ? [...tarefas].sort((a, b) => compararPorData(a, b, ordenacaoData)) : tarefas
    const { grupos, activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useKanbanDnd<Tarefa>({
      itens: itensOrdenados, colunas,
      getId: t => t.id!,
      getColuna: t => t.dataLimite || '',
      onMudarColuna: (id, novaData) => onUpdateDataLimite(id, novaData),
      onReordenar: (_coluna, ids) => onReordenar?.(ids),
    })
    const tarefaAtiva = activeId ? tarefas.find(t => t.id === activeId) : null

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setSemanaOffset(o => o - 1)} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronLeft size={13} /></button>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 160, textAlign: 'center' }}>
            {dias[0].getDate()} {MESES[dias[0].getMonth()].slice(0, 3)} – {dias[6].getDate()} {MESES[dias[6].getMonth()].slice(0, 3)} {dias[6].getFullYear()}
          </div>
          <button onClick={() => setSemanaOffset(o => o + 1)} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronRight size={13} /></button>
          {semanaOffset !== 0 && (
            <button onClick={() => setSemanaOffset(0)} className="btn btn-ghost" style={{ fontSize: 11 }}>Esta semana</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, minWidth: 0, width: '100%' }}>
          {dias.map((d, i) => {
            const iso = colunas[i]
            const items = grupos[iso] || []
            const ehHoje = iso === hojeISO
            return (
              <DroppableColumn key={iso} id={iso} items={items.map(t => t.id!)}>
                {isOver => (
                  <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={colunaEstilo(ehHoje ? 'var(--brand)' : 'var(--border-strong)', isOver)}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: ehHoje ? 'var(--brand)' : 'var(--text-primary)' }}>
                        {NOMES_DIAS_SEMANA[i]} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>{d.getDate()}/{d.getMonth() + 1}</span>
                      </span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
                    </div>
                    {items.map(t => (
                      <SortableItem key={t.id} id={t.id!}>{renderCartao(t, true)}</SortableItem>
                    ))}
                    {items.length === 0 && (
                      <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: isOver ? 'var(--accent-blue)' : 'var(--text-faint)', border: `1px dashed ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`, borderRadius: 8 }}>{isOver ? 'Largar aqui' : 'Vazio'}</div>
                    )}
                    {renderAdicionar(`semana-${iso}`, { status: 'PENDENTE', categoria: '', dataLimite: iso })}
                  </div>
                )}
              </DroppableColumn>
            )
          })}
        </div>
        <DragOverlay>{tarefaAtiva ? <div style={{ width: 240 }}>{renderCartao(tarefaAtiva, true)}</div> : null}</DragOverlay>
      </DndContext>
    )
  }

  function DiaCalendario({ dia }: { dia: number }) {
    const chave = `dia-${ano}-${mes}-${dia}`
    const { setNodeRef, isOver } = useDroppable({ id: chave })
    const dataISO = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const porDia: Record<number, Tarefa[]> = {}
    tarefas.forEach(t => {
      if (t.dataLimite) {
        const [y, m, d] = t.dataLimite.split('-').map(Number)
        if (y === ano && m === mes) porDia[d] = [...(porDia[d] || []), t]
      }
    })
    const itens = porDia[dia] || []

    return (
      <div ref={setNodeRef} style={{
        minHeight: 74, borderRadius: 6, padding: 4,
        backgroundColor: isOver ? 'color-mix(in srgb, var(--brand) 10%, var(--bg-card))' : 'var(--bg-card)',
        border: isOver ? '1px dashed var(--brand)' : '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 3 }}>{dia}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {itens.map(t => (
            <DraggableTarefaChip key={t.id} tarefa={t} onToggle={onToggle} />
          ))}
        </div>
        {onCriar && (
          criandoChave === `dia-${dia}` ? (
            <input autoFocus value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter') submeterCriacao({ status: 'PENDENTE', categoria: '', dataLimite: dataISO })
                if (e.key === 'Escape') cancelarCriacao()
              }}
              onBlur={() => { if (!novoTitulo.trim()) cancelarCriacao() }}
              placeholder="Título…"
              style={{ fontSize: 9, width: '100%', marginTop: 2, padding: '2px 3px', border: '1px solid var(--border-strong)', borderRadius: 3, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', outline: 'none' }} />
          ) : (
            <button onClick={e => { e.stopPropagation(); abrirCriacao(`dia-${dia}`) }}
              style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2, width: '100%', fontSize: 9, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Plus size={8} /> tarefa
            </button>
          )
        )}
      </div>
    )
  }

  function DraggableTarefaChip({ tarefa, onToggle: onToggleChip }: { tarefa: Tarefa; onToggle: (id: string, status: TarefaStatus) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tarefa.id! })
    return (
      <div ref={setNodeRef} {...attributes} {...listeners}
        onClick={() => onToggleChip(tarefa.id!, tarefa.status)}
        title={tarefa.titulo}
        style={{
          fontSize: 9, padding: '2px 4px', borderRadius: 3, cursor: 'grab',
          backgroundColor: tarefa.status === 'CONCLUIDA' ? 'var(--pill-green-bg)' : 'var(--pill-blue-bg)',
          color: tarefa.status === 'CONCLUIDA' ? 'var(--accent-green)' : 'var(--accent-blue)',
          textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          opacity: isDragging ? 0 : 1,
          transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        }}>
        {tarefa.titulo}
      </div>
    )
  }

  function SemDataLinha({ tarefa }: { tarefa: Tarefa }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tarefa.id! })
    return (
      <div ref={setNodeRef} {...attributes} {...listeners}
        onClick={() => onToggle(tarefa.id!, tarefa.status)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 4, cursor: 'grab',
          fontSize: 12, color: tarefa.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)',
          textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none',
          opacity: isDragging ? 0 : 1,
          transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        }}>
        {tarefa.status === 'CONCLUIDA' ? <CheckSquare size={13} style={{ color: 'var(--brand)' }} /> : <Square size={13} style={{ color: 'var(--text-faint)' }} />}
        {tarefa.titulo}
      </div>
    )
  }

  function CalendarioView() {
    const diasNoMes = new Date(ano, mes, 0).getDate()
    const diaSemanaInicio = new Date(ano, mes - 1, 1).getDay()

    const semData: Tarefa[] = tarefas.filter(t => {
      if (!t.dataLimite) return true
      const [y, m] = t.dataLimite.split('-').map(Number)
      return !(y === ano && m === mes)
    })

    const celulas: (number | null)[] = [...Array(diaSemanaInicio).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]

    function handleDragEnd(e: DragEndEvent) {
      const { active, over } = e
      if (!over) return
      const match = String(over.id).match(/^dia-(\d+)-(\d+)-(\d+)$/)
      if (!match) return
      const dataISO = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      const tarefa = tarefas.find(t => t.id === String(active.id))
      if (!tarefa) return
      if (altAtivoRef.current && onDuplicar) {
        onDuplicar(tarefa.id!, dataISO)
      } else if (tarefa.dataLimite !== dataISO) {
        onUpdateDataLimite(String(active.id), dataISO)
      }
    }

    return (
      <DndContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => { if (mes === 1) { setMes(12); setAno(a => a - 1) } else setMes(m => m - 1) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronLeft size={13} /></button>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 120, textAlign: 'center' }}>{MESES[mes - 1]} {ano}</div>
            <button onClick={() => { if (mes === 12) { setMes(1); setAno(a => a + 1) } else setMes(m => m + 1) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronRight size={13} /></button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, minWidth: 560 }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>
              ))}
              {celulas.map((dia, i) => (
                dia ? <DiaCalendario key={i} dia={dia} /> : <div key={i} style={{ minHeight: 74 }} />
              ))}
            </div>
          </div>

          {semData.length > 0 && (
            <div className="card" style={{ padding: 12 }}>
              <div className="sec-title">Sem data definida ({semData.length})</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>
                Arrasta para um dia do calendário para definir a data-limite. Segura Alt para duplicar em vez de mover.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {semData.map(t => (
                  <SemDataLinha key={t.id} tarefa={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      </DndContext>
    )
  }

  return (
    <div onClick={() => openDropdown && setOpenDropdown(null)} style={{ width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {VISTAS.map(v => {
          const Icon = v.icon
          return (
            <button key={v.id} onClick={() => setVista(v.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: vista === v.id ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: vista === v.id ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: vista === v.id ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              <Icon size={12} /> {v.label}
            </button>
          )
        })}
        {(vista === 'status' || vista === 'categoria') && (
          <button onClick={cicloOrdenacaoData} title="Ordenar tarefas por data-limite"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginLeft: 'auto', border: ordenacaoData ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: ordenacaoData ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: ordenacaoData ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {ordenacaoData === 'asc' ? <ArrowUp size={12} /> : ordenacaoData === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
            {ordenacaoData === 'asc' ? 'Data crescente' : ordenacaoData === 'desc' ? 'Data decrescente' : 'Ordenar por data'}
          </button>
        )}
      </div>

      {tarefas.length === 0 && !onCriar ? (
        <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)' }}>Sem tarefas</div>
      ) : (
        <>
          {vista === 'status' && <KanbanStatus />}
          {vista === 'categoria' && <KanbanCategoria />}
          {vista === 'calendario' && <CalendarioView />}
          {vista === 'semana' && <KanbanSemana />}
        </>
      )}
    </div>
  )
}
