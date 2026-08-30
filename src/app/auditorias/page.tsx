'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Plus, Loader2, X } from 'lucide-react'
import { auditoriasService, leadsService, type Auditoria, type AuditoriaStatus, type Lead } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

const STATUS_LABEL: Record<AuditoriaStatus, { label: string; cls: string }> = {
  PENDENTE: { label: 'Pendente', cls: 'pill-gray' },
  EM_CURSO: { label: 'Em curso', cls: 'pill-blue' },
  CONCLUIDA: { label: 'Concluída', cls: 'pill-amber' },
  ENVIADA: { label: 'Enviada', cls: 'pill-green' },
}

function scoreGlobal(a: Auditoria): number | null {
  const vals = [a.scoreGoogle, a.scoreWebsite, a.scoreSEO, a.scoreRedes, a.scoreConversao].filter((v): v is number => typeof v === 'number')
  return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null
}
function formatarData(ts?: { toDate: () => Date }) {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return '—' }
}

export default function AuditoriasPage() {
  const router = useRouter()
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<AuditoriaStatus | 'TODOS'>('TODOS')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [a, l] = await Promise.all([auditoriasService.getAll(), leadsService.getAll()])
      setAuditorias(a.sort((x, y) => (y.createdAt?.toMillis?.() || 0) - (x.createdAt?.toMillis?.() || 0)))
      setLeads(l)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtradas = useMemo(() => filtroStatus === 'TODOS' ? auditorias : auditorias.filter(a => a.status === filtroStatus), [auditorias, filtroStatus])

  async function criar(leadId: string) {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    const id = await auditoriasService.create({ leadId, leadNome: lead.empresa, status: 'PENDENTE' })
    router.push(`/auditorias/${id}`)
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Auditorias" icon={ClipboardCheck} actions={<>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as AuditoriaStatus | 'TODOS')} className="select" style={{ width: 150 }}>
          <option value="TODOS">Todos os estados</option>
          {(Object.keys(STATUS_LABEL) as AuditoriaStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s].label}</option>)}
        </select>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={13} /> Nova auditoria</button>
      </>} />

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Lead', 'Status', 'Score global', 'Plano recomendado', 'Data de criação', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{a.leadNome}</td>
                    <td style={{ padding: '9px 12px' }}><span className={`pill ${STATUS_LABEL[a.status].cls}`}>{STATUS_LABEL[a.status].label}</span></td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{scoreGlobal(a) ?? '—'}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{a.planoRecomendado || '—'}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{formatarData(a.createdAt as { toDate: () => Date } | undefined)}</td>
                    <td style={{ padding: '9px 12px' }}><button onClick={() => router.push(`/auditorias/${a.id}`)} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>Abrir</button></td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-faint)' }}>Sem auditorias</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ width: 'min(380px, 94vw)', maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Nova auditoria</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
            </div>
            <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Lead</label>
            <select className="select" defaultValue="" onChange={e => e.target.value && criar(e.target.value)}>
              <option value="" disabled>Selecionar lead…</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.empresa}</option>)}
            </select>
            {!leads.length && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>Ainda não há leads criados.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
