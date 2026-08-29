'use client'

import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus, Loader2, X, AlertTriangle } from 'lucide-react'
import { propostasService, leadsService, type Proposta, type PropostaStatus, type PlanoRec, type Lead } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DatePicker } from '@/components/ui/DatePicker'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useKanbanDnd } from '@/components/dnd/useKanbanDnd'
import { SortableItem } from '@/components/dnd/SortableItem'
import { DroppableColumn } from '@/components/dnd/DroppableColumn'

const COLUNAS: { id: PropostaStatus; label: string; color: string }[] = [
  { id: 'PREPARACAO', label: 'Preparação', color: 'var(--text-muted)' },
  { id: 'ENVIADA', label: 'Enviada', color: 'var(--accent-blue)' },
  { id: 'NEGOCIACAO', label: 'Negociação', color: 'var(--accent-amber)' },
  { id: 'ACEITE', label: 'Aceite', color: 'var(--accent-green)' },
  { id: 'RECUSADA', label: 'Recusada', color: 'var(--accent-red)' },
]
const PLANOS: PlanoRec[] = ['ONE', 'PRESENCE', 'GROWTH', 'PERSONALIZADO']

const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }
function diasDesde(iso?: string): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function PropostasConteudo() {
  const searchParams = useSearchParams()
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(searchParams.get('novo') === '1')
  const leadIdPreset = searchParams.get('leadId') || ''

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [p, l] = await Promise.all([propostasService.getAll(), leadsService.getAll()])
      setPropostas(p)
      setLeads(l)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function moverStatus(id: string, status: PropostaStatus) {
    setPropostas(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    await propostasService.update(id, { status })
  }
  function handleCriada(nova: Proposta) {
    setPropostas(prev => [...prev, nova])
    setShowModal(false)
  }

  const chaveMesAtual = new Date().toISOString().slice(0, 7)
  const totais = useMemo(() => {
    const pipeline = propostas.filter(p => p.status !== 'RECUSADA').reduce((s, p) => s + p.valor, 0)
    const negociacao = propostas.filter(p => p.status === 'NEGOCIACAO').reduce((s, p) => s + p.valor, 0)
    const ganhasMes = propostas.filter(p => p.status === 'ACEITE' && (p.updatedAt as unknown as string)?.startsWith?.(chaveMesAtual)).reduce((s, p) => s + p.valor, 0)
    const perdidas = propostas.filter(p => p.status === 'RECUSADA').length
    return { pipeline, negociacao, ganhasMes, perdidas }
  }, [propostas, chaveMesAtual])

  const colunas = useMemo(() => COLUNAS.map(c => c.id), [])
  const { grupos, activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useKanbanDnd<Proposta>({
    itens: propostas, colunas,
    getId: p => p.id!,
    getColuna: p => p.status,
    onMudarColuna: (id, novoStatus) => moverStatus(id, novoStatus as PropostaStatus),
  })
  const propostaAtiva = activeId ? propostas.find(p => p.id === activeId) : null

  function renderCartao(p: Proposta) {
    const dias = diasDesde(p.updatedAt as unknown as string)
    const semResposta = p.status === 'ENVIADA' && dias !== null && dias > 7
    return (
      <Link href={`/propostas/${p.id}`} style={{ textDecoration: 'none' }}>
        <div className="card" style={{ padding: 10, borderLeft: semResposta ? '2px solid var(--accent-red)' : undefined }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{p.leadNome}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.plano}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-green)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(p.valor)}/mês</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{dias !== null ? `${dias}d` : ''}</span>
            {semResposta && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--accent-red)' }}><AlertTriangle size={10} /> Sem resposta</span>}
          </div>
        </div>
      </Link>
    )
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Propostas" icon={FileText} actions={
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={13} /> Nova proposta</button>
      } />

      <div style={{ display: 'flex', gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Pipeline total</div><div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(totais.pipeline)}/mês</div></div>
        <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Em negociação</div><div style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent-amber)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(totais.negociacao)}/mês</div></div>
        <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Ganhas este mês</div><div style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent-green)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(totais.ganhasMes)}/mês</div></div>
        <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Perdidas</div><div style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent-red)', fontVariantNumeric: 'tabular-nums' }}>{totais.perdidas}</div></div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, minWidth: 0 }}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
            {COLUNAS.map(col => {
              const itens = grupos[col.id] || []
              return (
                <DroppableColumn key={col.id} id={col.id} items={itens.map(p => p.id!)}>
                  {isOver => (
                    <div style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card)', borderRadius: 8, borderTop: `2px solid ${col.color}`, borderRight: `1px ${isOver ? 'dashed' : 'solid'} ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`, borderBottom: `1px ${isOver ? 'dashed' : 'solid'} ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}`, borderLeft: `1px ${isOver ? 'dashed' : 'solid'} ${isOver ? 'var(--brand)' : 'var(--border-subtle)'}` }}>
                        <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>{col.label}</span>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{itens.length}</span>
                      </div>

                      {itens.map(p => (
                        <SortableItem key={p.id} id={p.id!}>{renderCartao(p)}</SortableItem>
                      ))}

                      <Link href={`/propostas/novo?status=${col.id}`} onClick={e => { e.preventDefault(); setShowModal(true) }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 10px', border: '1px dashed var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-faint)', textDecoration: 'none' }}>
                        <Plus size={12} /> Adicionar
                      </Link>
                    </div>
                  )}
                </DroppableColumn>
              )
            })}
          </div>
          <DragOverlay>{propostaAtiva ? <div style={{ width: 230 }}>{renderCartao(propostaAtiva)}</div> : null}</DragOverlay>
        </DndContext>
      </div>

      {showModal && <ModalNovaProposta leads={leads} leadIdPreset={leadIdPreset} onClose={() => setShowModal(false)} onCreated={handleCriada} />}
    </div>
  )
}

function ModalNovaProposta({ leads, leadIdPreset, onClose, onCreated }: { leads: Lead[]; leadIdPreset: string; onClose: () => void; onCreated: (p: Proposta) => void }) {
  const leadPreset = leads.find(l => l.id === leadIdPreset)
  const [leadId, setLeadId] = useState(leadIdPreset)
  const [plano, setPlano] = useState<PlanoRec>(leadPreset?.planoRec || 'PRESENCE')
  const [valor, setValor] = useState(leadPreset?.valorPotencial ? String(leadPreset.valorPotencial) : '')
  const [canvaUrl, setCanvaUrl] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [validadeAte, setValidadeAte] = useState('')
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  const valido = !!leadId && Number(valor) > 0

  async function guardar() {
    if (!valido) return
    setSalvando(true)
    try {
      const lead = leads.find(l => l.id === leadId)
      const dados: Omit<Proposta, 'id' | 'createdAt' | 'updatedAt'> = {
        leadId, leadNome: lead?.empresa || '', plano, valor: Number(valor), status: 'PREPARACAO',
        canvaUrl: canvaUrl.trim() || undefined, pdfUrl: pdfUrl.trim() || undefined,
        validadeAte: validadeAte || undefined, notas: notas.trim() || undefined,
      }
      const id = await propostasService.create(dados)
      if (leadId) await leadsService.updateStatus(leadId, 'PROPOSTA')
      onCreated({ id, ...dados })
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 420, maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Nova proposta</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Lead *</label>
            <select className="select" value={leadId} onChange={e => setLeadId(e.target.value)}>
              <option value="">Selecionar lead…</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.empresa}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Plano</label>
              <select className="select" value={plano} onChange={e => setPlano(e.target.value as PlanoRec)}>
                {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Valor mensal (€) *</label><input className="input" type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Link Canva</label><input className="input" value={canvaUrl} onChange={e => setCanvaUrl(e.target.value)} placeholder="https://canva.com/..." /></div>
          <div><label style={labelStyle}>Link PDF</label><input className="input" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="https://..." /></div>
          <div><label style={labelStyle}>Válida até</label><DatePicker value={validadeAte} onChange={setValidadeAte} /></div>
          <div><label style={labelStyle}>Notas</label><textarea className="input" rows={2} value={notas} onChange={e => setNotas(e.target.value)} style={{ resize: 'vertical' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button onClick={guardar} disabled={!valido || salvando} className="btn btn-primary" style={{ opacity: (!valido || salvando) ? 0.6 : 1 }}>
            {salvando ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PropostasPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>}>
      <PropostasConteudo />
    </Suspense>
  )
}
