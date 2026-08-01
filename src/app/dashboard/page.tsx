'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Loader2, Users, ClipboardCheck, CalendarClock, FileText, TrendingUp } from 'lucide-react'
import { leadsService, auditoriasService, reunioesService, propostasService, type Lead, type LeadStatus, type Reuniao } from '@/lib/db'

const STATUS_LABEL: Record<LeadStatus, string> = {
  NOVO: 'Novo', QUALIFICACAO: 'Qualificação', AUDITORIA: 'Auditoria', REUNIAO: 'Reunião',
  PROPOSTA: 'Proposta', FECHADO: 'Fechado', PERDIDO: 'Perdido',
}
const STATUS_PILL_CLS: Record<LeadStatus, string> = {
  NOVO: 'pill-gray', QUALIFICACAO: 'pill-blue', AUDITORIA: 'pill-purple', REUNIAO: 'pill-amber',
  PROPOSTA: 'pill-blue', FECHADO: 'pill-green', PERDIDO: 'pill-red',
}

const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
function hojeISO() { return new Date().toISOString().slice(0, 10) }
function domingoDestaSemanaISO() {
  const hoje = new Date()
  const diasAteDomingo = (7 - hoje.getDay()) % 7
  const domingo = new Date(hoje)
  domingo.setDate(hoje.getDate() + diasAteDomingo)
  return domingo.toISOString().slice(0, 10)
}
function formatarDataPt(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalAuditorias, setTotalAuditorias] = useState(0)
  const [reunioes, setReunioes] = useState<Reuniao[]>([])
  const [totalPropostas, setTotalPropostas] = useState(0)
  const [propostasAbertas, setPropostasAbertas] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [ls, auditorias, reus, propostas] = await Promise.all([
        leadsService.getAll(), auditoriasService.getAll(), reunioesService.getAll(), propostasService.getAll(),
      ])
      setLeads(ls)
      setTotalAuditorias(auditorias.length)
      setReunioes(reus)
      setTotalPropostas(propostas.length)
      setPropostasAbertas(propostas.filter(p => p.status === 'ENVIADA' || p.status === 'NEGOCIACAO').length)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fechados = useMemo(() => leads.filter(l => l.status === 'FECHADO').length, [leads])
  const leadsAtivos = useMemo(() => leads.filter(l => l.status !== 'FECHADO' && l.status !== 'PERDIDO').length, [leads])
  const mrrPotencial = useMemo(() => leads.filter(l => l.status === 'PROPOSTA').reduce((s, l) => s + (l.valorPotencial || 0), 0), [leads])

  const reunioesEstaSemana = useMemo(() => {
    const hoje = hojeISO()
    const fim = domingoDestaSemanaISO()
    return reunioes.filter(r => r.status !== 'CANCELADA' && r.data >= hoje && r.data <= fim).length
  }, [reunioes])

  const proximasReunioes = useMemo(() =>
    [...reunioes].filter(r => r.status !== 'CANCELADA' && r.data >= hojeISO()).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).slice(0, 5),
    [reunioes])

  const leadsRecentes = useMemo(() =>
    [...leads].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 10),
    [leads])

  const funil = useMemo(() => {
    const etapas = [
      { label: 'Leads', valor: leads.length },
      { label: 'Auditorias', valor: totalAuditorias },
      { label: 'Reuniões', valor: reunioes.length },
      { label: 'Propostas', valor: totalPropostas },
      { label: 'Fechados', valor: fechados },
    ]
    return etapas.map((e, i) => ({
      ...e,
      conversao: i === 0 || etapas[i - 1].valor === 0 ? null : Math.round((e.valor / etapas[i - 1].valor) * 100),
    }))
  }, [leads.length, totalAuditorias, reunioes.length, totalPropostas, fechados])
  const maxFunil = Math.max(1, ...funil.map(e => e.valor))

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0, fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
        <LayoutDashboard size={18} style={{ color: 'var(--accent-blue)' }} /> Dashboard Comercial
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}><Users size={11} /> Leads activos</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>{leadsAtivos}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}><CalendarClock size={11} /> Reuniões esta semana</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-amber)', fontVariantNumeric: 'tabular-nums' }}>{reunioesEstaSemana}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-purple)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}><FileText size={11} /> Propostas em aberto</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-purple)', fontVariantNumeric: 'tabular-nums' }}>{propostasAbertas}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-green)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}><TrendingUp size={11} /> MRR potencial</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-green)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(mrrPotencial)}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="sec-title"><ClipboardCheck size={11} /> Funil comercial</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingTop: 6 }}>
              {funil.map((etapa, i) => (
                <div key={etapa.label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{etapa.valor}</div>
                    <div style={{ width: '100%', height: 64, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${Math.max(4, (etapa.valor / maxFunil) * 100)}%`, backgroundColor: 'var(--brand)', borderRadius: '4px 4px 0 0', opacity: 0.3 + (0.7 * (i + 1)) / funil.length }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{etapa.label}</div>
                  </div>
                  {i < funil.length - 1 && (
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', minWidth: 34, textAlign: 'center' }}>
                      {funil[i + 1].conversao !== null ? `${funil[i + 1].conversao}%` : '—'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, alignItems: 'start' }}>
            <div className="card" style={{ padding: 16, minWidth: 0 }}>
              <div className="sec-title">Leads recentes</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Empresa', 'Origem', 'Fase', 'Score', 'Próxima ação'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leadsRecentes.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 8px' }}><Link href={`/leads/${l.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{l.empresa}</Link></td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-secondary)' }}>{l.origem}</td>
                        <td style={{ padding: '7px 8px' }}><span className={`pill ${STATUS_PILL_CLS[l.status]}`}>{STATUS_LABEL[l.status]}</span></td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-secondary)' }}>{l.score ?? '—'}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{l.proximaAcao || '—'}</td>
                      </tr>
                    ))}
                    {!leadsRecentes.length && (
                      <tr><td colSpan={5} style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-faint)' }}>Sem leads ainda</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title"><CalendarClock size={11} /> Próximas reuniões</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proximasReunioes.map(r => (
                  <Link key={r.id} href={`/reunioes/${r.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nomeAssociado}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)', flexShrink: 0, marginLeft: 6 }}>{formatarDataPt(r.data)} {r.hora}</span>
                  </Link>
                ))}
                {!proximasReunioes.length && <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Sem reuniões agendadas</div>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
