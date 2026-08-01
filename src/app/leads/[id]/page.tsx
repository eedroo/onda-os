'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckSquare, Square, ClipboardList, Users2, FileText, Plus, ExternalLink } from 'lucide-react'
import {
  leadsService, auditoriasService, reunioesService, propostasService,
  type Lead, type LeadStatus, type Origem, type PlanoRec,
  type Auditoria, type Reuniao, type Proposta,
} from '@/lib/db'

const ORIGENS: { id: Origem; label: string }[] = [
  { id: 'INSTAGRAM', label: 'Instagram' }, { id: 'LANDING', label: 'Landing page' },
  { id: 'INDICACAO', label: 'Indicação' }, { id: 'COLD', label: 'Cold outreach' }, { id: 'OUTRO', label: 'Outro' },
]
const PLANOS: { id: PlanoRec; label: string }[] = [
  { id: 'ONE', label: 'One' }, { id: 'PRESENCE', label: 'Presence' }, { id: 'GROWTH', label: 'Growth' }, { id: 'PERSONALIZADO', label: 'Personalizado' },
]
const STATUS_LABEL: Record<LeadStatus, string> = {
  NOVO: 'Novo', QUALIFICACAO: 'Qualificação', AUDITORIA: 'Auditoria', REUNIAO: 'Reunião',
  PROPOSTA: 'Proposta', FECHADO: 'Fechado', PERDIDO: 'Perdido',
}
const CHECKLIST_ITENS = [
  { id: 'empresa-validada', label: 'Empresa validada' },
  { id: 'contacto-obtido', label: 'Contacto obtido' },
  { id: 'presenca-analisada', label: 'Presença digital analisada' },
  { id: 'auditoria-enviada', label: 'Auditoria enviada' },
  { id: 'reuniao-agendada', label: 'Reunião agendada' },
  { id: 'proposta-enviada', label: 'Proposta enviada' },
  { id: 'contrato-assinado', label: 'Contrato assinado' },
]

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }
const fieldStyle: CSSProperties = { marginBottom: 12 }

function formatarDataHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

export default function LeadDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null)
  const [reunioes, setReunioes] = useState<Reuniao[]>([])
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const l = await leadsService.getById(id)
      setLead(l)
      if (l) {
        const [auds, reus, props] = await Promise.all([
          auditoriasService.getByLead(id), reunioesService.getByLead(id), propostasService.getByLead(id),
        ])
        setAuditoria(auds[0] || null)
        setReunioes(reus.sort((a, b) => b.data.localeCompare(a.data)))
        setPropostas(props.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function set<K extends keyof Lead>(campo: K, valor: Lead[K]) {
    setLead(prev => prev ? { ...prev, [campo]: valor } : prev)
  }
  async function salvar<K extends keyof Lead>(campo: K, valor: Lead[K]) {
    await leadsService.update(id, { [campo]: valor } as Partial<Lead>)
  }
  async function mudarStatus(status: LeadStatus) {
    set('status', status)
    await leadsService.updateStatus(id, status)
    load()
  }
  async function toggleChecklist(itemId: string) {
    if (!lead) return
    const atual = lead.checklist || []
    const novo = atual.includes(itemId) ? atual.filter(x => x !== itemId) : [...atual, itemId]
    set('checklist', novo)
    await leadsService.update(id, { checklist: novo })
  }
  async function criarAuditoria() {
    if (!lead) return
    const novaId = await auditoriasService.create({ leadId: id, leadNome: lead.empresa, status: 'PENDENTE' })
    router.push(`/auditorias/${novaId}`)
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!lead) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Lead não encontrado</div>

  const scoreGlobalAuditoria = auditoria ? (() => {
    const vals = [auditoria.scoreGoogle, auditoria.scoreWebsite, auditoria.scoreSEO, auditoria.scoreRedes, auditoria.scoreConversao].filter((v): v is number => typeof v === 'number')
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null
  })() : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ArrowLeft size={14} /></button>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{lead.empresa}</div>
        </div>
        <select value={lead.status} onChange={e => mudarStatus(e.target.value as LeadStatus)} className="select" style={{ width: 160 }}>
          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 14, alignItems: 'start' }}>

          {/* Esquerda: dados + score + próxima ação */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Dados</div>
              <div style={fieldStyle}><label style={labelStyle}>Empresa</label><input className="input" value={lead.empresa} onChange={e => set('empresa', e.target.value)} onBlur={e => salvar('empresa', e.target.value)} /></div>
              <div style={fieldStyle}><label style={labelStyle}>Contacto</label><input className="input" value={lead.contacto || ''} onChange={e => set('contacto', e.target.value)} onBlur={e => salvar('contacto', e.target.value)} /></div>
              <div style={fieldStyle}><label style={labelStyle}>Email</label><input className="input" value={lead.email || ''} onChange={e => set('email', e.target.value)} onBlur={e => salvar('email', e.target.value)} /></div>
              <div style={fieldStyle}><label style={labelStyle}>Telefone</label><input className="input" value={lead.telefone || ''} onChange={e => set('telefone', e.target.value)} onBlur={e => salvar('telefone', e.target.value)} /></div>
              <div style={fieldStyle}><label style={labelStyle}>Website</label><input className="input" value={lead.website || ''} onChange={e => set('website', e.target.value)} onBlur={e => salvar('website', e.target.value)} /></div>
              <div style={fieldStyle}><label style={labelStyle}>Instagram</label><input className="input" value={lead.instagram || ''} onChange={e => set('instagram', e.target.value)} onBlur={e => salvar('instagram', e.target.value)} /></div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Origem</label>
                <select className="select" value={lead.origem} onChange={e => { set('origem', e.target.value as Origem); salvar('origem', e.target.value as Origem) }}>
                  {ORIGENS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Plano recomendado</label>
                <select className="select" value={lead.planoRec || ''} onChange={e => { set('planoRec', e.target.value as PlanoRec); salvar('planoRec', e.target.value as PlanoRec) }}>
                  <option value="">—</option>
                  {PLANOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Score geral</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => { set('score', n); salvar('score', n) }}
                    style={{ width: 30, height: 30, borderRadius: 6, border: lead.score === n ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: lead.score === n ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: lead.score === n ? 'var(--accent-blue)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
                Score por dimensão (Google, Website, SEO, Redes, Conversão) fica associado à auditoria — ver painel à direita.
              </div>
              <label style={labelStyle}>Próxima ação</label>
              <input className="input" value={lead.proximaAcao || ''} onChange={e => set('proximaAcao', e.target.value)} onBlur={e => salvar('proximaAcao', e.target.value)} placeholder="Ex: Ligar amanhã" />
            </div>
          </div>

          {/* Centro: checklist + notas + timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title"><ClipboardList size={11} /> Checklist de qualificação</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {CHECKLIST_ITENS.map(item => {
                  const feito = (lead.checklist || []).includes(item.id)
                  return (
                    <button key={item.id} onClick={() => toggleChecklist(item.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 6px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}>
                      {feito ? <CheckSquare size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} /> : <Square size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, color: feito ? 'var(--text-faint)' : 'var(--text-secondary)', textDecoration: feito ? 'line-through' : 'none' }}>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Notas</div>
              <textarea className="input" rows={5} value={lead.notas || ''} onChange={e => set('notas', e.target.value)} onBlur={e => salvar('notas', e.target.value)} style={{ resize: 'vertical' }} placeholder="Observações sobre este lead..." />
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Timeline de actividade</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...(lead.historico || [])].reverse().map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--brand)', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Passou a <strong style={{ color: 'var(--text-primary)' }}>{STATUS_LABEL[h.status]}</strong></div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{formatarDataHora(h.data)}</div>
                    </div>
                  </div>
                ))}
                {!(lead.historico || []).length && <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Sem histórico ainda</div>}
              </div>
            </div>
          </div>

          {/* Direita: auditoria + reuniões + propostas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Auditoria</div>
              {auditoria ? (
                <Link href={`/auditorias/${auditoria.id}`} style={{ display: 'block', padding: '10px 12px', backgroundColor: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{auditoria.status}</span>
                    {scoreGlobalAuditoria && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>{scoreGlobalAuditoria}/5</span>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}>Ver auditoria <ExternalLink size={10} /></span>
                </Link>
              ) : (
                <button onClick={criarAuditoria} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}><Plus size={12} /> Criar auditoria</button>
              )}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="sec-title" style={{ marginBottom: 0 }}><Users2 size={11} /> Reuniões</div>
                <Link href={`/reunioes?novo=1&leadId=${id}`} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 7px' }}><Plus size={10} /> Nova</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reunioes.map(r => (
                  <Link key={r.id} href={`/reunioes/${r.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 9px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.tipo}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{r.data}</span>
                  </Link>
                ))}
                {!reunioes.length && <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Sem reuniões</div>}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="sec-title" style={{ marginBottom: 0 }}><FileText size={11} /> Propostas</div>
                <Link href={`/propostas?novo=1&leadId=${id}`} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 7px' }}><Plus size={10} /> Nova</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {propostas.map(p => (
                  <Link key={p.id} href={`/propostas/${p.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 9px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.plano}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.status}</span>
                  </Link>
                ))}
                {!propostas.length && <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Sem propostas</div>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
