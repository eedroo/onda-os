'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Loader2, CheckSquare, Square, ClipboardList, Users2, FileText, Plus, ExternalLink,
  ClipboardCheck, CalendarPlus, FileSignature, ThumbsUp, ThumbsDown, RotateCcw, X, Activity,
} from 'lucide-react'
import {
  leadsService, auditoriasService, reunioesService, propostasService,
  type Lead, type LeadStatus, type Origem, type PlanoRec,
  type Auditoria, type Reuniao, type Proposta, type TimelineEntry,
} from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

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
const STATUS_PILL_CLS: Record<LeadStatus, string> = {
  NOVO: 'pill-gray', QUALIFICACAO: 'pill-blue', AUDITORIA: 'pill-purple', REUNIAO: 'pill-amber',
  PROPOSTA: 'pill-blue', FECHADO: 'pill-green', PERDIDO: 'pill-red',
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

function formatarDataHora(ts?: { toDate: () => Date }) {
  if (!ts) return '—'
  try {
    const d = ts.toDate()
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

type AccaoModal = null | 'auditoria' | 'fechar' | 'perder'

export default function LeadDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null)
  const [reunioes, setReunioes] = useState<Reuniao[]>([])
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<AccaoModal>(null)
  const [aProcessar, setAProcessar] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const l = await leadsService.getById(id)
      setLead(l)
      if (l) {
        const [auds, reus, props, tl] = await Promise.all([
          auditoriasService.getByLead(id), reunioesService.getByLead(id), propostasService.getByLead(id), leadsService.getTimeline(id),
        ])
        setAuditoria(auds[0] || null)
        setReunioes(reus.sort((a, b) => b.data.localeCompare(a.data)))
        setPropostas(props.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
        setTimeline(tl)
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
  async function toggleChecklist(itemId: string) {
    if (!lead) return
    const atual = lead.checklist || []
    const novo = atual.includes(itemId) ? atual.filter(x => x !== itemId) : [...atual, itemId]
    set('checklist', novo)
    await leadsService.update(id, { checklist: novo })
  }
  async function criarAuditoriaAvulsa() {
    if (!lead) return
    const novaId = await auditoriasService.create({ leadId: id, leadNome: lead.empresa, status: 'PENDENTE' })
    router.push(`/auditorias/${novaId}`)
  }

  // ── Acções do funil ──
  async function qualificar() {
    await leadsService.updateStatus(id, 'QUALIFICACAO')
    toast.success('Lead qualificado')
    load()
  }
  async function confirmarNovaAuditoria() {
    if (!lead) return
    setAProcessar(true)
    try {
      const novaId = await auditoriasService.create({ leadId: id, leadNome: lead.empresa, status: 'PENDENTE', planoRecomendado: lead.planoRec })
      await leadsService.updateStatus(id, 'AUDITORIA')
      router.push(`/auditorias/${novaId}`)
    } catch (e) { console.error(e) }
    finally { setAProcessar(false); setModal(null) }
  }
  async function confirmarFecho() {
    if (!lead) return
    setAProcessar(true)
    try {
      const novoClienteId = await leadsService.fecharLead(lead)
      toast.success('Cliente criado')
      router.push(`/clientes/${novoClienteId}`)
    } catch (e) { console.error(e) }
    finally { setAProcessar(false); setModal(null) }
  }
  async function confirmarPerda(motivo: string) {
    setAProcessar(true)
    try {
      const notaMotivo = '\n[PERDIDO]' + (motivo.trim() ? ` ${motivo.trim()}` : '')
      await leadsService.update(id, { notas: (lead?.notas || '') + notaMotivo })
      await leadsService.updateStatus(id, 'PERDIDO')
      toast.success('Lead marcado como perdido')
      setModal(null)
      load()
    } catch (e) { console.error(e) }
    finally { setAProcessar(false) }
  }
  async function reactivar() {
    await leadsService.updateStatus(id, 'NOVO')
    toast.success('Lead reactivado')
    load()
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!lead) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Lead não encontrado</div>

  const scoreGlobalAuditoria = auditoria ? (() => {
    const vals = [auditoria.scoreGoogle, auditoria.scoreWebsite, auditoria.scoreSEO, auditoria.scoreRedes, auditoria.scoreConversao].filter((v): v is number => typeof v === 'number')
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null
  })() : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title={<>{lead.empresa} <span className={`pill ${STATUS_PILL_CLS[lead.status]}`}>{STATUS_LABEL[lead.status]}</span></>} onBack={() => router.back()} actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lead.status === 'NOVO' && (
            <button onClick={qualificar} className="btn btn-primary"><ClipboardCheck size={13} /> Qualificar</button>
          )}
          {lead.status === 'QUALIFICACAO' && (
            <button onClick={() => setModal('auditoria')} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}><ClipboardCheck size={13} /> Nova auditoria</button>
          )}
          {lead.status === 'AUDITORIA' && (
            <button onClick={() => router.push(`/reunioes?novo=1&leadId=${id}`)} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}><CalendarPlus size={13} /> Agendar reunião</button>
          )}
          {lead.status === 'REUNIAO' && (
            <button onClick={() => router.push(`/propostas?novo=1&leadId=${id}`)} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}><FileSignature size={13} /> Gerar proposta</button>
          )}
          {lead.status === 'PROPOSTA' && (
            <button onClick={() => setModal('fechar')} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}><ThumbsUp size={13} /> Cliente fechou ✓</button>
          )}
          {lead.status === 'PERDIDO' && (
            <button onClick={reactivar} className="btn btn-ghost"><RotateCcw size={13} /> Reactivar lead</button>
          )}
          {lead.status !== 'FECHADO' && lead.status !== 'PERDIDO' && (
            <button onClick={() => setModal('perder')} className="btn btn-ghost" style={{ color: 'var(--accent-red)' }}><ThumbsDown size={13} /> Perdemos</button>
          )}
        </div>
      } />

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 14, alignItems: 'start' }}>

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
              <div style={fieldStyle}>
                <label style={labelStyle}>Plano recomendado</label>
                <select className="select" value={lead.planoRec || ''} onChange={e => { set('planoRec', e.target.value as PlanoRec); salvar('planoRec', e.target.value as PlanoRec) }}>
                  <option value="">—</option>
                  {PLANOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Valor potencial (€/mês)</label>
                <input className="input" type="number" min="0" step="0.01" value={lead.valorPotencial ?? ''} onChange={e => set('valorPotencial', Number(e.target.value))} onBlur={e => salvar('valorPotencial', Number(e.target.value))} />
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
              <div className="sec-title"><Activity size={11} /> Timeline de actividade</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {timeline.map((h, i) => (
                  <div key={h.id || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--brand)', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.descricao}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{formatarDataHora(h.createdAt as unknown as { toDate: () => Date } | undefined)}</div>
                    </div>
                  </div>
                ))}
                {!timeline.length && <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Sem histórico ainda</div>}
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
                <button onClick={criarAuditoriaAvulsa} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}><Plus size={12} /> Criar auditoria</button>
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

      {modal === 'auditoria' && (
        <ConfirmModal titulo="Nova auditoria" mensagem={`Isto cria uma auditoria para "${lead.empresa}" e avança o lead para a fase Auditoria.`}
          textoConfirmar="Criar auditoria" aProcessar={aProcessar} onConfirm={confirmarNovaAuditoria} onClose={() => setModal(null)} />
      )}
      {modal === 'fechar' && (
        <ConfirmModal titulo="Confirmar fecho" mensagem="Esta acção cria o cliente no sistema (com plano e serviços recomendados) e um contrato em rascunho."
          textoConfirmar="Confirmar fecho" corConfirmar="var(--accent-green)" aProcessar={aProcessar} onConfirm={confirmarFecho} onClose={() => setModal(null)} />
      )}
      {modal === 'perder' && (
        <ConfirmModal titulo="Marcar como perdido" mensagem="Podes indicar o motivo (fica registado nas notas do lead)."
          comCampo labelCampo="Motivo (opcional)" textoConfirmar="Marcar como perdido" corConfirmar="var(--accent-red)" aProcessar={aProcessar}
          onConfirm={confirmarPerda} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function ConfirmModal({
  titulo, mensagem, comCampo, labelCampo, textoConfirmar, corConfirmar, aProcessar, onConfirm, onClose,
}: {
  titulo: string; mensagem: string; comCampo?: boolean; labelCampo?: string
  textoConfirmar: string; corConfirmar?: string; aProcessar: boolean
  onConfirm: (valor: string) => void; onClose: () => void
}) {
  const [valor, setValor] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 'min(400px, 94vw)', maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{titulo}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: comCampo ? 12 : 18, lineHeight: 1.5 }}>{mensagem}</div>
        {comCampo && (
          <div style={{ marginBottom: 18 }}>
            {labelCampo && <label style={labelStyle}>{labelCampo}</label>}
            <textarea className="input" rows={3} value={valor} onChange={e => setValor(e.target.value)} style={{ resize: 'vertical' }} autoFocus />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button onClick={() => onConfirm(valor)} disabled={aProcessar} className="btn btn-primary"
            style={{ backgroundColor: corConfirmar || 'var(--brand)', borderColor: corConfirmar || 'var(--brand)', opacity: aProcessar ? 0.6 : 1 }}>
            {aProcessar ? <Loader2 size={12} className="animate-spin" /> : null} {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
