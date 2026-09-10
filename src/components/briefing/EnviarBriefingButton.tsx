'use client'

import { useState } from 'react'
import { ClipboardList, Copy, Check, X, Loader2 } from 'lucide-react'
import { briefingLinksService, BRIEFING_CATEGORIA_INFO, type BriefingCategoria } from '@/lib/db'

const CATEGORIAS = Object.keys(BRIEFING_CATEGORIA_INFO) as BriefingCategoria[]

export function EnviarBriefingButton({ leadId, clienteId, nomeAssociado }: {
  leadId?: string; clienteId?: string; nomeAssociado: string
}) {
  const [open, setOpen] = useState(false)
  const [categoria, setCategoria] = useState<BriefingCategoria | null>(null)
  const [gerando, setGerando] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  function abrir() {
    setCategoria(null); setLink(null); setCopiado(false)
    setOpen(true)
  }

  async function gerar() {
    if (!categoria) return
    setGerando(true)
    try {
      const token = await briefingLinksService.criar({ categoria, leadId, clienteId, nomeAssociado })
      setLink(`${window.location.origin}/briefing/${token}`)
    } catch (e) { console.error(e) }
    finally { setGerando(false) }
  }

  function copiar() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500) })
  }

  return (
    <>
      <button onClick={abrir} className="btn btn-ghost"><ClipboardList size={13} /> Enviar briefing</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setOpen(false)}>
          <div className="card" style={{ width: 'min(380px, 94vw)', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Enviar briefing</div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
            </div>

            {!link ? (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Qual serviço?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {CATEGORIAS.map(c => (
                    <button key={c} onClick={() => setCategoria(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: categoria === c ? '2px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: categoria === c ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--bg-input)' }}>
                      <span>{BRIEFING_CATEGORIA_INFO[c].icon}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{BRIEFING_CATEGORIA_INFO[c].label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
                  <button onClick={gerar} disabled={!categoria || gerando} className="btn btn-primary">
                    {gerando ? <Loader2 size={12} className="animate-spin" /> : null} Gerar link
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Link gerado — envia-o ao cliente:</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  <input className="input" readOnly value={link} onClick={e => (e.target as HTMLInputElement).select()} style={{ fontSize: 11 }} />
                  <button onClick={copiar} className="btn btn-primary" style={{ flexShrink: 0 }}>
                    {copiado ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setOpen(false)} className="btn btn-ghost">Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
