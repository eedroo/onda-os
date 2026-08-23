'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Search, Loader2, ClipboardCheck, CalendarClock, AlertTriangle } from 'lucide-react'
import { leadsService, reunioesService, auditoriasService, propostasService, type Lead, type LeadStatus, type Origem, type Reuniao, type Proposta } from '@/lib/db'
import type { Timestamp } from 'firebase/firestore'
import { PageHeader } from '@/components/ui/PageHeader'

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
const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

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
function formatarDataCurta(iso: string, hojeStr: string) {
  if (iso === hojeStr) return 'Hoje'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [auditoriaLeadIds, setAuditoriaLeadIds] = useState<Set<string>>(new Set())
  const [reuniaoPorLead, setReuniaoPorLead] = useState<Record<string, Reuniao>>({})
  const [propostaPorLead, setPropostaPorLead] = useState<Record<string, Proposta>>({})
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState('')
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [colunaSobre, setColunaSobre] = useState<LeadStatus | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [ls, reunioes, auditorias, propostas] = await Promise.all([
        leadsService.getAll(), reunioesService.getAll(), auditoriasService.getAll(), propostasService.getAll(),
      ])
      setLeads(ls)
      setAuditoriaLeadIds(new Set(auditorias.map(a => a.leadId)))

      const hojeStr = new Date().toISOString().slice(0, 10)
      const proximas: Record<string, Reuniao> = {}
      reunioes.filter(r => r.status === 'AGENDADA' && r.leadId && r.data >= hojeStr).forEach(r => {
        const atual = proximas[r.leadId!]
        if (!atual || r.data < atual.data) proximas[r.leadId!] = r
      })
      setReuniaoPorLead(proximas)

      const propostasAtivas: Record<string, Proposta> = {}
      propostas.filter(p => p.status !== 'RECUSADA').forEach(p => {
        const atual = propostasAtivas[p.leadId]
        if (!atual || (p.createdAt?.toMillis?.() || 0) > (atual.createdAt?.toMillis?.() || 0)) propostasAtivas[p.leadId] = p
      })
      setPropostaPorLead(propostasAtivas)
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

  const hojeStr = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Leads" icon={Users} actions={<>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--text-faint)' }} />
          <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar lead..."
            className="input" style={{ width: 180, paddingLeft: 26 }} />
        </div>
        <Link href="/leads/novo" className="btn btn-primary"><Plus size={13} /> Novo lead</Link>
      </>} />

      <div style={{ flex: 1, overflow: 'auto', padding: 16, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
          {COLUNAS.map(col => {
            const itens = leadsFiltrados.filter(l => l.status === col.id)
            const emFoco = colunaSobre === col.id
            return (
              <div key={col.id} style={{ width: 226, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
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
                  const proximaReuniao = lead.id ? reuniaoPorLead[lead.id] : undefined
                  const reuniaoHoje = proximaReuniao?.data === hojeStr
                  const propostaAtiva = lead.id ? propostaPorLead[lead.id] : undefined
                  const temAuditoria = lead.id ? auditoriaLeadIds.has(lead.id) : false
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.empresa}</span>
                          {temAuditoria && <ClipboardCheck size={11} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span className="pill pill-blue">{ORIGEM_LABEL[lead.origem]}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{lead.planoRec || '—'}</span>
                        </div>
                        <ScoreDots score={lead.score} />

                        {(proximaReuniao || propostaAtiva) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                            {proximaReuniao && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: reuniaoHoje ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                                <CalendarClock size={10} /> {formatarDataCurta(proximaReuniao.data, hojeStr)} às {proximaReuniao.hora}
                              </div>
                            )}
                            {propostaAtiva && (
                              <div style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                                {fmtEUR.format(propostaAtiva.valor)}/mês proposto
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                          {atrasado ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--accent-red)' }}>
                              <AlertTriangle size={10} /> {diasParado}d sem actividade
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.proximaAcao || '—'}
                            </span>
                          )}
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
