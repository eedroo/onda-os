'use client'

import { useState, type DragEvent } from 'react'
import Link from 'next/link'
import { CheckSquare, Square, Clock, Trash2, LayoutGrid, Calendar as CalendarIcon, Tag, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Tarefa, TarefaStatus, Categoria } from '@/lib/db'

interface NovaTarefaDados { titulo: string; status: TarefaStatus; categoria: string; dataLimite?: string }

export const CATEGORIA_EMOJI: Record<string, string> = {
  'Google Business': '📍', 'SEO': '🔍', 'Site': '🌐',
  'Blog': '✍️', 'Relatório': '📊', 'Estratégia': '🎯',
}

export const STATUS_OPTIONS: { value: TarefaStatus; label: string; color: string; bg: string }[] = [
  { value: 'PENDENTE',  label: 'Pendente',  color: 'var(--text-muted)',   bg: 'var(--pill-gray-bg)' },
  { value: 'EM_CURSO',  label: 'Em curso',  color: 'var(--accent-blue)',  bg: 'var(--pill-blue-bg)' },
  { value: 'CONCLUIDA', label: 'Concluída', color: 'var(--accent-green)', bg: 'var(--pill-green-bg)' },
  { value: 'BLOQUEADA', label: 'Bloqueada', color: 'var(--accent-red)',   bg: 'var(--pill-red-bg)' },
]

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Vista = 'status' | 'calendario' | 'categoria'
const VISTAS: { id: Vista; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'status', label: 'Status', icon: LayoutGrid },
  { id: 'calendario', label: 'Calendário', icon: CalendarIcon },
  { id: 'categoria', label: 'Categoria', icon: Tag },
]

interface TarefasBoardProps {
  tarefas: Tarefa[]
  categoriasConfig: Categoria[]
  onToggle: (id: string, statusAtual: TarefaStatus) => void
  onSetStatus: (id: string, novo: TarefaStatus) => void
  onSetCategoria?: (id: string, categoria: string) => void
  onUpdateDataLimite: (id: string, data: string) => void
  onRemover?: (id: string) => void
  onCriar?: (dados: NovaTarefaDados) => void | Promise<void>
  clienteNomePorId?: Record<string, string>
  mesInicial?: number
  anoInicial?: number
}

export default function TarefasBoard({
  tarefas, categoriasConfig, onToggle, onSetStatus, onSetCategoria, onUpdateDataLimite, onRemover, onCriar, clienteNomePorId,
  mesInicial, anoInicial,
}: TarefasBoardProps) {
  const [vista, setVista] = useState<Vista>('status')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [colunaSobre, setColunaSobre] = useState<string | null>(null)
  const [criandoChave, setCriandoChave] = useState<string | null>(null)
  const [novoTitulo, setNovoTitulo] = useState('')
  const hoje = new Date()
  const [mes, setMes] = useState(mesInicial ?? hoje.getMonth() + 1)
  const [ano, setAno] = useState(anoInicial ?? hoje.getFullYear())

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

  function renderCartao(tarefa: Tarefa, mostrarStatus: boolean, arrastavel: boolean) {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === tarefa.status)
    return (
      <div key={tarefa.id} className="card"
        draggable={arrastavel}
        onDragStart={() => setArrastandoId(tarefa.id!)}
        onDragEnd={() => { setArrastandoId(null); setColunaSobre(null) }}
        style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, cursor: arrastavel ? 'grab' : 'default', opacity: arrastandoId === tarefa.id ? 0.4 : 1 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <button onClick={() => onToggle(tarefa.id!, tarefa.status)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1 }}>
            {tarefa.status === 'CONCLUIDA' ? <CheckSquare size={14} style={{ color: 'var(--brand)' }} /> : <Square size={14} style={{ color: 'var(--text-faint)' }} />}
          </button>
          <Link href={`/tarefas/${tarefa.id}`} style={{ flex: 1, fontSize: 12, lineHeight: 1.3, color: tarefa.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: tarefa.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
            {tarefa.titulo}
          </Link>
          {onRemover && (
            <button onClick={() => onRemover(tarefa.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0, flexShrink: 0 }}>
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{CATEGORIA_EMOJI[tarefa.categoria] || '📌'} {tarefa.categoria}</span>
          {clienteNomePorId && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, backgroundColor: 'var(--bg-input)', color: 'var(--text-faint)' }}>{clienteNomePorId[tarefa.clienteId] || ''}</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} style={{ color: 'var(--text-faint)' }} />
            <input type="date" value={tarefa.dataLimite || ''} onChange={e => onUpdateDataLimite(tarefa.id!, e.target.value)}
              style={{ fontSize: 9, color: 'var(--text-faint)', backgroundColor: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', width: 76 }} />
          </div>
        </div>
        {mostrarStatus && (
          <div style={{ position: 'relative' }}>
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

  function KanbanStatus() {
    return (
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, minWidth: 0, width: '100%' }}>
        {STATUS_OPTIONS.map(opt => {
          const items = tarefas.filter(t => t.status === opt.value)
          const emFoco = colunaSobre === `status-${opt.value}`
          return (
            <div key={opt.value} style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
              onDragOver={e => { e.preventDefault(); if (arrastandoId) setColunaSobre(`status-${opt.value}`) }}
              onDragLeave={() => setColunaSobre(c => c === `status-${opt.value}` ? null : c)}
              onDrop={e => {
                e.preventDefault()
                setColunaSobre(null)
                const id = arrastandoId
                setArrastandoId(null)
                if (!id) return
                const tarefa = tarefas.find(t => t.id === id)
                if (tarefa && tarefa.status !== opt.value) onSetStatus(id, opt.value)
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: emFoco ? '1px dashed var(--brand)' : '1px solid var(--border-subtle)', borderTop: `2px solid ${opt.color}`, borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: opt.color }}>{opt.label}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
              </div>
              {items.map(t => renderCartao(t, false, true))}
              {items.length === 0 && (
                <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: emFoco ? 'var(--accent-blue)' : 'var(--text-faint)', border: `1px dashed ${emFoco ? 'var(--brand)' : 'var(--border-subtle)'}`, borderRadius: 8 }}>{emFoco ? 'Largar aqui' : 'Vazio'}</div>
              )}
              {renderAdicionar(`status-${opt.value}`, { status: opt.value, categoria: '' })}
            </div>
          )
        })}
      </div>
    )
  }

  function KanbanCategoria() {
    const nomesConfigurados = categoriasConfig.map(c => c.nome)
    const semCategoria = tarefas.filter(t => !nomesConfigurados.includes(t.categoria))

    function dropHandlers(chaveColuna: string, nomeCategoria: string) {
      if (!onSetCategoria) return {}
      return {
        onDragOver: (e: DragEvent) => { e.preventDefault(); if (arrastandoId) setColunaSobre(chaveColuna) },
        onDragLeave: () => setColunaSobre(c => c === chaveColuna ? null : c),
        onDrop: (e: DragEvent) => {
          e.preventDefault()
          setColunaSobre(null)
          const id = arrastandoId
          setArrastandoId(null)
          if (!id) return
          const tarefa = tarefas.find(t => t.id === id)
          if (tarefa && tarefa.categoria !== nomeCategoria) onSetCategoria(id, nomeCategoria)
        },
      }
    }

    return (
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, minWidth: 0, width: '100%' }}>
        {categoriasConfig.map(cat => {
          const items = tarefas.filter(t => t.categoria === cat.nome)
          const chave = `cat-${cat.id}`
          const emFoco = colunaSobre === chave
          return (
            <div key={cat.id} style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }} {...dropHandlers(chave, cat.nome)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: emFoco ? '1px dashed var(--brand)' : '1px solid var(--border-subtle)', borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{CATEGORIA_EMOJI[cat.nome] || '📌'} {cat.nome}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
              </div>
              {items.map(t => renderCartao(t, true, !!onSetCategoria))}
              {items.length === 0 && (
                <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: emFoco ? 'var(--accent-blue)' : 'var(--text-faint)', border: `1px dashed ${emFoco ? 'var(--brand)' : 'var(--border-subtle)'}`, borderRadius: 8 }}>{emFoco ? 'Largar aqui' : 'Vazio'}</div>
              )}
              {renderAdicionar(`cria-cat-${cat.id}`, { status: 'PENDENTE', categoria: cat.nome })}
            </div>
          )
        })}
        {(semCategoria.length > 0 || onCriar) && (
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }} {...dropHandlers('cat-nenhuma', '')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: colunaSobre === 'cat-nenhuma' ? '1px dashed var(--brand)' : '1px solid var(--border-subtle)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)' }}>📌 Sem categoria</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{semCategoria.length}</span>
            </div>
            {semCategoria.map(t => renderCartao(t, true, !!onSetCategoria))}
            {renderAdicionar('cria-cat-nenhuma', { status: 'PENDENTE', categoria: '' })}
          </div>
        )}
        {categoriasConfig.length === 0 && semCategoria.length === 0 && !onCriar && (
          <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', width: '100%' }}>Sem categorias configuradas</div>
        )}
      </div>
    )
  }

  function CalendarioView() {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { if (mes === 1) { setMes(12); setAno(a => a - 1) } else setMes(m => m - 1) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronLeft size={13} /></button>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 120, textAlign: 'center' }}>{MESES[mes - 1]} {ano}</div>
          <button onClick={() => { if (mes === 12) { setMes(1); setAno(a => a + 1) } else setMes(m => m + 1) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronRight size={13} /></button>
        </div>
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
                      <div key={t.id} onClick={() => onToggle(t.id!, t.status)}
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
                  {onCriar && (
                    criandoChave === `dia-${dia}` ? (
                      <input autoFocus value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') submeterCriacao({ status: 'PENDENTE', categoria: '', dataLimite: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` })
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
                <div key={t.id} onClick={() => onToggle(t.id!, t.status)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', cursor: 'pointer', fontSize: 12, color: t.status === 'CONCLUIDA' ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: t.status === 'CONCLUIDA' ? 'line-through' : 'none' }}>
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
    <div onClick={() => openDropdown && setOpenDropdown(null)} style={{ width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
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

      {tarefas.length === 0 && !onCriar ? (
        <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)' }}>Sem tarefas</div>
      ) : (
        <>
          {vista === 'status' && <KanbanStatus />}
          {vista === 'categoria' && <KanbanCategoria />}
          {vista === 'calendario' && <CalendarioView />}
        </>
      )}
    </div>
  )
}
