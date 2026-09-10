'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Loader2, Copy, Check, ExternalLink, X } from 'lucide-react'
import {
  briefingLinksService, briefingRespostasService, BRIEFING_CATEGORIA_INFO,
  type BriefingLink, type BriefingResposta, type BriefingCategoria,
} from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

const CATEGORIAS = Object.keys(BRIEFING_CATEGORIA_INFO) as BriefingCategoria[]

function formatarData(ts?: { toDate: () => Date }) {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return '—' }
}

export default function BriefingsPage() {
  const [links, setLinks] = useState<BriefingLink[]>([])
  const [respostas, setRespostas] = useState<BriefingResposta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState<BriefingCategoria | 'TODOS'>('TODOS')
  const [copiadoId, setCopiadoId] = useState<string | null>(null)
  const [respostaAberta, setRespostaAberta] = useState<BriefingResposta | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [l, r] = await Promise.all([briefingLinksService.getAll(), briefingRespostasService.getAll()])
      setLinks(l.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
      setRespostas(r)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const respostaPorLinkId = useMemo(() => {
    const map: Record<string, BriefingResposta> = {}
    respostas.forEach(r => { map[r.linkId] = r })
    return map
  }, [respostas])

  const linksFiltrados = useMemo(() => {
    if (filtroCategoria === 'TODOS') return links
    return links.filter(l => l.categoria === filtroCategoria)
  }, [links, filtroCategoria])

  function copiarLink(token: string) {
    const url = `${window.location.origin}/briefing/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiadoId(token)
      setTimeout(() => setCopiadoId(null), 1500)
    })
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Briefings" icon={ClipboardList} />

      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        <button onClick={() => setFiltroCategoria('TODOS')}
          style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: filtroCategoria === 'TODOS' ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: filtroCategoria === 'TODOS' ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: filtroCategoria === 'TODOS' ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
          Todos
        </button>
        {CATEGORIAS.map(c => (
          <button key={c} onClick={() => setFiltroCategoria(c)}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: filtroCategoria === c ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: filtroCategoria === c ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: filtroCategoria === c ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {BRIEFING_CATEGORIA_INFO[c].icon} {BRIEFING_CATEGORIA_INFO[c].label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {linksFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 13 }}>
            Sem briefings enviados ainda — envia um a partir da ficha de um lead ou cliente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 900, margin: '0 auto' }}>
            {linksFiltrados.map(l => {
              const resposta = respostaPorLinkId[l.id!]
              const info = BRIEFING_CATEGORIA_INFO[l.categoria]
              return (
                <div key={l.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{info.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nomeAssociado}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{info.label} · enviado {formatarData(l.createdAt)}</div>
                  </div>
                  {l.status === 'RESPONDIDO' ? (
                    <>
                      <span className="pill pill-green" style={{ flexShrink: 0 }}>Respondido</span>
                      {resposta && (
                        <button onClick={() => setRespostaAberta(resposta)} className="btn btn-ghost" style={{ flexShrink: 0 }}>Ver respostas</button>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="pill pill-amber" style={{ flexShrink: 0 }}>Pendente</span>
                      <button onClick={() => copiarLink(l.id!)} className="btn btn-ghost" style={{ flexShrink: 0 }}>
                        {copiadoId === l.id ? <Check size={12} /> : <Copy size={12} />} {copiadoId === l.id ? 'Copiado' : 'Copiar link'}
                      </button>
                    </>
                  )}
                  {(l.leadId || l.clienteId) && (
                    <Link href={l.clienteId ? `/clientes/${l.clienteId}` : `/leads/${l.leadId}`} className="btn btn-ghost" style={{ padding: '4px 8px', flexShrink: 0 }} title="Ver ficha">
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {respostaAberta && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setRespostaAberta(null)}>
          <div className="card" style={{ width: 'min(520px, 94vw)', maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{respostaAberta.nomeAssociado}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{BRIEFING_CATEGORIA_INFO[respostaAberta.categoria].icon} {BRIEFING_CATEGORIA_INFO[respostaAberta.categoria].label} · {formatarData(respostaAberta.createdAt)}</div>
              </div>
              <button onClick={() => setRespostaAberta(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {respostaAberta.respostas.map((r, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {Array.isArray(r.valor) ? (r.valor.length ? r.valor.join(', ') : '—') : (r.valor || '—')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
