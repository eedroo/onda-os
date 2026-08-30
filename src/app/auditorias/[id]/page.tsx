'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ExternalLink, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { auditoriasService, leadsService, type Auditoria, type AuditoriaStatus, type PlanoRec, type Lead } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

const STATUS_OPTIONS: AuditoriaStatus[] = ['PENDENTE', 'EM_CURSO', 'CONCLUIDA', 'ENVIADA']
const PLANOS: PlanoRec[] = ['ONE', 'PRESENCE', 'GROWTH', 'PERSONALIZADO']
const CATEGORIAS: { campo: 'scoreGoogle' | 'scoreWebsite' | 'scoreSEO' | 'scoreRedes' | 'scoreConversao'; label: string }[] = [
  { campo: 'scoreGoogle', label: 'Google Business' },
  { campo: 'scoreWebsite', label: 'Website' },
  { campo: 'scoreSEO', label: 'SEO' },
  { campo: 'scoreRedes', label: 'Redes Sociais' },
  { campo: 'scoreConversao', label: 'Conversão' },
]

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

export default function AuditoriaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const a = await auditoriasService.getById(id)
      setAuditoria(a)
      if (a?.leadId) setLead(await leadsService.getById(a.leadId))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function set<K extends keyof Auditoria>(campo: K, valor: Auditoria[K]) {
    setAuditoria(prev => prev ? { ...prev, [campo]: valor } : prev)
  }
  async function salvar<K extends keyof Auditoria>(campo: K, valor: Auditoria[K]) {
    await auditoriasService.update(id, { [campo]: valor } as Partial<Auditoria>)
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!auditoria) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Auditoria não encontrada</div>

  const scores = CATEGORIAS.map(c => ({ ...c, valor: auditoria[c.campo] }))
  const definidos = scores.filter(s => typeof s.valor === 'number')
  const scoreGlobal = definidos.length ? Math.round((definidos.reduce((s, x) => s + (x.valor as number), 0) / definidos.length) * 10) / 10 : null
  const criticos = definidos.filter(s => (s.valor as number) <= 2)
  const medios = definidos.filter(s => (s.valor as number) === 3)
  const ok = definidos.filter(s => (s.valor as number) >= 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title={`Auditoria — ${auditoria.leadNome}`} onBack={() => router.back()} actions={
        <select value={auditoria.status} onChange={e => { const v = e.target.value as AuditoriaStatus; set('status', v); salvar('status', v) }} className="select" style={{ width: 140 }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      } />

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 14, alignItems: 'start' }}>

          {/* Esquerda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Lead</div>
              {lead ? (
                <Link href={`/leads/${lead.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, color: 'var(--accent-blue)', marginBottom: 4 }}>
                  {lead.empresa} <ExternalLink size={11} />
                </Link>
              ) : <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{auditoria.leadNome}</div>}
            </div>

            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div className="sec-title" style={{ justifyContent: 'center' }}>Score global</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--accent-blue)' }}>{scoreGlobal ?? '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>de 5 pontos ({definidos.length}/5 categorias avaliadas)</div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <label style={labelStyle}>Plano recomendado</label>
              <select className="select" value={auditoria.planoRecomendado || ''} onChange={e => { const v = e.target.value as PlanoRec; set('planoRecomendado', v); salvar('planoRecomendado', v) }}>
                <option value="">—</option>
                {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Centro */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Scores por categoria</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CATEGORIAS.map(cat => (
                  <div key={cat.campo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cat.label}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => { set(cat.campo, n); salvar(cat.campo, n) }}
                          style={{ width: 24, height: 24, borderRadius: 5, border: auditoria[cat.campo] === n ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: auditoria[cat.campo] === n ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: auditoria[cat.campo] === n ? 'var(--accent-blue)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Diagnóstico</div>
              <textarea className="input" rows={7} value={auditoria.diagnostico || ''} onChange={e => set('diagnostico', e.target.value)} onBlur={e => salvar('diagnostico', e.target.value)} style={{ resize: 'vertical' }} placeholder="Descreve os problemas encontrados e o contexto do negócio..." />
            </div>
          </div>

          {/* Direita */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Resumo de problemas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><AlertTriangle size={13} style={{ color: 'var(--accent-red)' }} /> <span style={{ color: 'var(--text-secondary)' }}>Críticos</span> <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--accent-red)' }}>{criticos.length}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><AlertCircle size={13} style={{ color: 'var(--accent-amber)' }} /> <span style={{ color: 'var(--text-secondary)' }}>Médios</span> <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--accent-amber)' }}>{medios.length}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><CheckCircle2 size={13} style={{ color: 'var(--accent-green)' }} /> <span style={{ color: 'var(--text-secondary)' }}>Ok</span> <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--accent-green)' }}>{ok.length}</span></div>
              </div>
              {criticos.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-faint)' }}>
                  {criticos.map(c => c.label).join(', ')}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Argumento de venda</div>
              <textarea className="input" rows={4} value={auditoria.argumentoVenda || ''} onChange={e => set('argumentoVenda', e.target.value)} onBlur={e => salvar('argumentoVenda', e.target.value)} style={{ resize: 'vertical' }} placeholder="Como apresentar esta oportunidade ao lead..." />
            </div>

            <div className="card" style={{ padding: 16 }}>
              <label style={labelStyle}>Próximo passo</label>
              <input className="input" value={auditoria.proximoPasso || ''} onChange={e => set('proximoPasso', e.target.value)} onBlur={e => salvar('proximoPasso', e.target.value)} placeholder="Ex: Agendar reunião de apresentação" />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
