'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Search, Loader2 } from 'lucide-react'
import { leadsService, reunioesService, type Lead, type LeadStatus, type Origem } from '@/lib/db'
import type { Timestamp } from 'firebase/firestore'

const COLUNAS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'NOVO', label: 'Novo', color: 'var(--accent-blue)' },
  { id: 'QUALIFICACAO', label: 'Qualificação', color: 'var(--accent-purple)' },
  { id: 'AUDITORIA', label: 'Auditoria', color: 'var(--accent-teal)' },
  { id: 'REUNIAO', label: 'Reunião', color: 'var(--accent-amber)' },
  { id: 'PROPOSTA', label: 'Proposta', color: 'var(--accent-purple)' },
  { id: 'FECHADO', label: 'Fechado', color: 'var(--accent-green)' },
  { id: 'PERDIDO', label: 'Perdido', color: 'var(--accent-red)' },
]

const ORIGEM_LABEL: Record<Origem, string> = {
  INSTAGRAM: 'Instagram', LANDING: 'Landing', INDICACAO: 'Indicação', COLD: 'Cold', OUTRO: 'Outro',
}

function ScoreDots({ score = 0 }: { score?: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          backgroundColor: i > score ? 'var(--border-subtle)' : score >= 4 ? 'var(--accent-red)' : score >= 3 ? 'var(--accent-amber)' : 'var(--accent-blue)',
        }} />
      ))}
    </div>
  )
}

function diasDesde(iso?: string): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}
function timestampToISO(ts?: Timestamp): string | undefined {
  if (!ts) return undefined
  try { return ts.toDate().toISOString() } catch { return undefined }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsComReuniaoHoje, setLeadsComReuniaoHoje] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState('')
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [colunaSobre, setColunaSobre] = useState<LeadStatus | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [ls, reunioes] = await Promise.all([leadsService.getAll(), reunioesService.getAll()])
      setLeads(ls)
      const hojeStr = new Date().toISOString().slice(0, 10)
      setLeadsComReuniaoHoje(new Set(reunioes.filter(r => r.data === hojeStr && r.status === 'AGENDADA' && r.leadId).map(r => r.leadId!)))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function moverStatus(id: string, status: LeadStatus) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status, updatedAt: new Date().toISOString() as unknown as Timestamp } : l))
    await leadsService.updateStatus(id, status)
  }

  const leadsFiltrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase()
    if (!q) return leads
    return leads.filter(l => l.empresa.toLowerCase().includes(q))
  }, [leads, pesquisa])

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
          <Users size={18} style={{ color: 'var(--accent-blue)' }} /> Leads
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--text-faint)' }} />
            <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar lead..."
              className="input" style={{ width: 180, paddingLeft: 26 }} />
          </div>
          <Link href="/leads/novo" className="btn btn-primary"><Plus size={13} /> Novo lead</Link>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
          {COLUNAS.map(col => {
            const itens = leadsFiltrados.filter(l => l.status === col.id)
            const emFoco = colunaSobre === col.id
            return (
              <div key={col.id} style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
                onDragOver={e => { e.preventDefault(); if (arrastandoId) setColunaSobre(col.id) }}
                onDragLeave={() => setColunaSobre(c => c === col.id ? null : c)}
                onDrop={e => {
                  e.preventDefault()
                  setColunaSobre(null)
                  const id = arrastandoId
                  setArrastandoId(null)
                  if (!id) return
                  const lead = leads.find(l => l.id === id)
                  if (lead && lead.status !== col.id) moverStatus(id, col.id)
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: emFoco ? '1px dashed var(--brand)' : '1px solid var(--border-subtle)', borderTop: `2px solid ${col.color}`, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{itens.length}</span>
                </div>

                {itens.map(lead => {
                  const dias = diasDesde(timestampToISO(lead.createdAt) || (lead.updatedAt as unknown as string))
                  const diasParado = diasDesde(lead.updatedAt as unknown as string)
                  const atrasado = diasParado !== null && diasParado > 5
                  const reuniaoHoje = lead.id ? leadsComReuniaoHoje.has(lead.id) : false
                  return (
                    <Link key={lead.id} href={`/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
                      <div className="card"
                        draggable
                        onDragStart={() => setArrastandoId(lead.id!)}
                        onDragEnd={() => { setArrastandoId(null); setColunaSobre(null) }}
                        style={{
                          padding: 10, cursor: 'grab', opacity: arrastandoId === lead.id ? 0.4 : 1,
                          borderLeft: atrasado ? '2px solid var(--accent-red)' : reuniaoHoje ? '2px solid var(--accent-blue)' : undefined,
                        }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{lead.empresa}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span className="pill pill-blue">{ORIGEM_LABEL[lead.origem]}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{lead.planoRec || '—'}</span>
                        </div>
                        <ScoreDots score={lead.score} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 10, color: atrasado ? 'var(--accent-red)' : reuniaoHoje ? 'var(--accent-blue)' : 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.proximaAcao || '—'}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-faint)', flexShrink: 0, marginLeft: 6 }}>{dias !== null ? `${dias}d` : ''}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}

                <Link href={`/leads/novo?status=${col.id}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 10px', border: '1px dashed var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-faint)', textDecoration: 'none' }}>
                  <Plus size={12} /> Adicionar
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
