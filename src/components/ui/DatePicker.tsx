'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const POPUP_WIDTH = 220

function parseISO(v?: string) {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

function formatPt(v?: string) {
  const p = parseISO(v)
  if (!p) return ''
  return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`
}

export function DatePicker({ value, onChange, compact, placeholder = 'Sem data' }: {
  value?: string
  onChange: (v: string) => void
  compact?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const parsed = parseISO(value)
  const hoje = new Date()
  const [viewMes, setViewMes] = useState(parsed?.m ?? hoje.getMonth() + 1)
  const [viewAno, setViewAno] = useState(parsed?.y ?? hoje.getFullYear())
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const alvo = e.target as Node
      if (triggerRef.current?.contains(alvo) || popupRef.current?.contains(alvo)) return
      setOpen(false)
    }
    function fechar() { setOpen(false) }
    if (open) {
      document.addEventListener('pointerdown', onDocPointerDown)
      window.addEventListener('scroll', fechar, true)
      window.addEventListener('resize', fechar)
    }
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [open])

  function abrir() {
    const p = parseISO(value)
    setViewMes(p?.m ?? hoje.getMonth() + 1)
    setViewAno(p?.y ?? hoje.getFullYear())
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const left = Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 10)
      setPos({ top: rect.bottom + 6, left: Math.max(6, left) })
    }
    setOpen(o => !o)
  }

  function selecionar(dia: number) {
    onChange(`${viewAno}-${String(viewMes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`)
    setOpen(false)
  }

  const diasNoMes = new Date(viewAno, viewMes, 0).getDate()
  const diaSemanaInicio = new Date(viewAno, viewMes - 1, 1).getDay()
  const celulas: (number | null)[] = [...Array(diaSemanaInicio).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: compact ? 'auto' : '100%' }} onPointerDown={e => e.stopPropagation()}>
      <button ref={triggerRef} type="button" onClick={e => { e.stopPropagation(); abrir() }}
        style={compact ? {
          display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 9, color: 'var(--text-faint)', padding: 0,
        } : {
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', width: '100%',
          padding: '0.5rem 0.75rem', borderRadius: '0.625rem',
          border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-input)',
          fontSize: '0.8125rem', color: value ? 'var(--text-secondary)' : 'var(--text-faint)',
        }}>
        <Calendar size={compact ? 9 : 13} style={{ flexShrink: 0 }} />
        {value ? formatPt(value) : placeholder}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={popupRef} onPointerDown={e => e.stopPropagation()}
          style={{ position: 'fixed', zIndex: 1000, top: pos.top, left: pos.left, width: POPUP_WIDTH, padding: 10, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button type="button" onClick={() => { if (viewMes === 1) { setViewMes(12); setViewAno(a => a - 1) } else setViewMes(m => m - 1) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><ChevronLeft size={14} /></button>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{MESES[viewMes - 1]} {viewAno}</div>
            <button type="button" onClick={() => { if (viewMes === 12) { setViewMes(1); setViewAno(a => a + 1) } else setViewMes(m => m + 1) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><ChevronRight size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
            {DIAS_SEMANA.map((d, i) => <div key={i} style={{ fontSize: 9, textAlign: 'center', color: 'var(--text-faint)' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {celulas.map((dia, i) => {
              const isSelecionado = !!parsed && parsed.y === viewAno && parsed.m === viewMes && parsed.d === dia
              const isHoje = dia === hoje.getDate() && viewMes === hoje.getMonth() + 1 && viewAno === hoje.getFullYear()
              return dia ? (
                <button key={i} type="button" onClick={() => selecionar(dia)}
                  style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, borderRadius: 6, cursor: 'pointer',
                    border: isHoje && !isSelecionado ? '1px solid var(--border-strong)' : '1px solid transparent',
                    backgroundColor: isSelecionado ? 'var(--brand)' : 'transparent',
                    color: isSelecionado ? '#fff' : 'var(--text-secondary)', fontWeight: isSelecionado ? 600 : 400,
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelecionado) e.currentTarget.style.backgroundColor = 'var(--bg-input)' }}
                  onMouseLeave={e => { if (!isSelecionado) e.currentTarget.style.backgroundColor = 'transparent' }}
                >{dia}</button>
              ) : <div key={i} />
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={() => {
              const h = new Date()
              setViewMes(h.getMonth() + 1); setViewAno(h.getFullYear())
              onChange(`${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`)
              setOpen(false)
            }} className="btn btn-ghost" style={{ flex: 1, fontSize: 10, justifyContent: 'center', padding: '4px 0' }}>Hoje</button>
            {value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 8px' }}>
                <X size={11} />
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
