'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import { relatoriosService, RELATORIO_TIPO_LABEL, type Relatorio } from '@/lib/db'

const PRIORIDADE_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  P1: { label: 'P1 — Resolver hoje', cor: 'var(--accent-red)', bg: 'var(--pill-red-bg)' },
  P2: { label: 'P2 — Acompanhar', cor: 'var(--accent-amber)', bg: 'var(--pill-amber-bg)' },
  P3: { label: 'P3 — Pode aguardar', cor: 'var(--text-muted)', bg: 'var(--pill-gray-bg)' },
}

function formatarData(ts?: { toDate: () => Date }) {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

export default function RelatorioDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    relatoriosService.getById(id).then(r => { setRelatorio(r); setLoading(false) }).catch(e => { console.error(e); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  if (!relatorio) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Relatório não encontrado</div>
  )

  const periodo = relatorio.periodoInicio === relatorio.periodoFim ? relatorio.periodoInicio : `${relatorio.periodoInicio} a ${relatorio.periodoFim}`
  const acoesPorPrioridade = { P1: relatorio.acoes.filter(a => a.prioridade === 'P1'), P2: relatorio.acoes.filter(a => a.prioridade === 'P2'), P3: relatorio.acoes.filter(a => a.prioridade === 'P3') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div className="onda-no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <button onClick={() => router.push('/relatorios')} className="btn btn-ghost"><ArrowLeft size={13} /> Relatórios</button>
        <button onClick={() => window.print()} className="btn btn-primary"><Printer size={13} /> Imprimir / Guardar PDF</button>
      </div>

      <div className="onda-print-area" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relatório {RELATORIO_TIPO_LABEL[relatorio.tipo]}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{periodo}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>Gerado em {formatarData(relatorio.geradoEm)}</div>
          </div>

          {relatorio.secoes.map((s, i) => (
            <div key={i} className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>{s.titulo}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.texto}</div>
            </div>
          ))}

          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Ações recomendadas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(['P1', 'P2', 'P3'] as const).map(p => (
                acoesPorPrioridade[p].length > 0 && (
                  <div key={p}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: PRIORIDADE_INFO[p].cor, marginBottom: 6 }}>{PRIORIDADE_INFO[p].label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {acoesPorPrioridade[p].map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', backgroundColor: PRIORIDADE_INFO[p].bg, borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                          <span>•</span><span>{a.texto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
              {relatorio.acoes.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Sem ações recomendadas neste relatório.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
