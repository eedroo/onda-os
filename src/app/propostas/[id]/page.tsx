'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ExternalLink, CheckSquare, Square, Sparkles } from 'lucide-react'
import { propostasService, leadsService, SERVICOS_BASE, type Proposta, type PropostaStatus, type PlanoRec, type Lead, type Plano } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

const STATUS_OPTIONS: PropostaStatus[] = ['PREPARACAO', 'ENVIADA', 'NEGOCIACAO', 'ACEITE', 'RECUSADA']
const CHECKLIST_PREP = [
  { id: 'auditoria-revista', label: 'Auditoria revista' },
  { id: 'plano-validado', label: 'Plano validado' },
  { id: 'valor-confirmado', label: 'Valor confirmado' },
  { id: 'documento-gerado', label: 'Documento gerado' },
  { id: 'enviado-lead', label: 'Enviado ao lead' },
]

const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

function gerarPrompt(lead: Lead | null, proposta: Proposta): string {
  const linhas = [
    `Cria uma proposta comercial persuasiva para "${proposta.leadNome}".`,
    lead?.origem ? `Origem do lead: ${lead.origem}.` : '',
    `Plano recomendado: ${proposta.plano}, valor mensal: ${fmtEUR.format(proposta.valor)}.`,
    lead?.notas ? `Contexto/notas sobre o negócio: ${lead.notas}` : '',
    'Foca-te nos benefícios concretos para o negócio e num tom directo, sem jargão técnico.',
  ]
  return linhas.filter(Boolean).join('\n')
}

export default function PropostaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [proposta, setProposta] = useState<Proposta | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const p = await propostasService.getById(id)
      setProposta(p)
      if (p?.leadId) setLead(await leadsService.getById(p.leadId))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function set<K extends keyof Proposta>(campo: K, valor: Proposta[K]) {
    setProposta(prev => prev ? { ...prev, [campo]: valor } : prev)
  }
  async function salvar<K extends keyof Proposta>(campo: K, valor: Proposta[K]) {
    await propostasService.update(id, { [campo]: valor } as Partial<Proposta>)
  }
  async function toggleChecklist(itemId: string) {
    if (!proposta) return
    const atual = proposta.checklist || []
    const novo = atual.includes(itemId) ? atual.filter(x => x !== itemId) : [...atual, itemId]
    set('checklist', novo)
    await propostasService.update(id, { checklist: novo })
  }
  async function gerarPromptIA() {
    if (!proposta) return
    const texto = gerarPrompt(lead, proposta)
    set('promptIA', texto)
    await propostasService.update(id, { promptIA: texto })
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!proposta) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Proposta não encontrada</div>

  const servicos = ['ONE', 'PRESENCE', 'GROWTH'].includes(proposta.plano) ? SERVICOS_BASE[proposta.plano as Plano] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title={`Proposta — ${proposta.leadNome}`} onBack={() => router.back()} actions={
        <select value={proposta.status} onChange={e => { const v = e.target.value as PropostaStatus; set('status', v); salvar('status', v) }} className="select" style={{ width: 150 }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      } />

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 14, alignItems: 'start' }}>

          {/* Esquerda: lead + plano hero */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Lead</div>
              {lead ? (
                <Link href={`/leads/${lead.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, color: 'var(--accent-blue)' }}>
                  {lead.empresa} <ExternalLink size={11} />
                </Link>
              ) : <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{proposta.leadNome}</div>}
            </div>

            <div className="card" style={{ padding: 20, textAlign: 'center', background: 'linear-gradient(180deg, color-mix(in srgb, var(--brand) 10%, transparent), transparent)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{proposta.plano}</div>
              <div style={{ fontSize: 30, fontWeight: 600, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(proposta.valor)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>por mês</div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Serviços incluídos</div>
              {servicos ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {servicos.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.nome}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{s.quantidade} {s.unidade}/{s.frequencia.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Plano personalizado — definir serviços manualmente</div>}
            </div>
          </div>

          {/* Centro: prompt IA + links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="sec-title" style={{ marginBottom: 0 }}><Sparkles size={11} /> Prompt IA</div>
                <button onClick={gerarPromptIA} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}>Gerar</button>
              </div>
              <textarea className="input" rows={8} value={proposta.promptIA || ''} onChange={e => set('promptIA', e.target.value)} onBlur={e => salvar('promptIA', e.target.value)} style={{ resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: 11 }} placeholder="Clica em Gerar para criar um prompt com base nos dados deste lead" />
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Documentos</div>
              <div style={fieldRow}><label style={labelStyle}>Link Canva</label><input className="input" value={proposta.canvaUrl || ''} onChange={e => set('canvaUrl', e.target.value)} onBlur={e => salvar('canvaUrl', e.target.value)} placeholder="https://canva.com/..." /></div>
              <div><label style={labelStyle}>Link PDF</label><input className="input" value={proposta.pdfUrl || ''} onChange={e => set('pdfUrl', e.target.value)} onBlur={e => salvar('pdfUrl', e.target.value)} placeholder="https://..." /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {proposta.canvaUrl && <a href={proposta.canvaUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 11 }}>Abrir Canva <ExternalLink size={10} /></a>}
                {proposta.pdfUrl && <a href={proposta.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 11 }}>Abrir PDF <ExternalLink size={10} /></a>}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Notas</div>
              <textarea className="input" rows={3} value={proposta.notas || ''} onChange={e => set('notas', e.target.value)} onBlur={e => salvar('notas', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Direita: checklist + timeline + próximo passo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Checklist de preparação</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {CHECKLIST_PREP.map(item => {
                  const feito = (proposta.checklist || []).includes(item.id)
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
              <div className="sec-title">Timeline</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Criada: {proposta.createdAt?.toDate?.().toLocaleDateString('pt-PT') || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Última alteração: {proposta.updatedAt ? new Date(proposta.updatedAt as unknown as string).toLocaleDateString('pt-PT') : '—'}</div>
              {proposta.validadeAte && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Válida até: {proposta.validadeAte}</div>}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <label style={labelStyle}>Próximo passo</label>
              <input className="input" value={proposta.proximoPasso || ''} onChange={e => set('proximoPasso', e.target.value)} onBlur={e => salvar('proximoPasso', e.target.value)} placeholder="Ex: Follow-up em 3 dias" />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

const fieldRow: CSSProperties = { marginBottom: 10 }
