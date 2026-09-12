'use client'

import { useState } from 'react'
import { ClipboardList, Copy, Check, X, Loader2, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import {
  briefingLinksService, briefingPerguntasService, BRIEFING_CATEGORIA_INFO, BRIEFING_TIPO_LABEL,
  type BriefingCategoria, type BriefingPerguntaTipo, type BriefingPerguntaSnapshot,
} from '@/lib/db'

const CATEGORIAS = Object.keys(BRIEFING_CATEGORIA_INFO) as BriefingCategoria[]
const TIPOS: BriefingPerguntaTipo[] = ['texto', 'textarea', 'escolha_unica', 'escolha_multipla', 'link']

function gerarIdLocal(): string {
  return `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

type Passo = 'categoria' | 'personalizar' | 'link'

export function EnviarBriefingButton({ leadId, clienteId, nomeAssociado }: {
  leadId?: string; clienteId?: string; nomeAssociado: string
}) {
  const [open, setOpen] = useState(false)
  const [passo, setPasso] = useState<Passo>('categoria')
  const [categoria, setCategoria] = useState<BriefingCategoria | null>(null)
  const [perguntas, setPerguntas] = useState<BriefingPerguntaSnapshot[]>([])
  const [carregandoTemplate, setCarregandoTemplate] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  function abrir() {
    setPasso('categoria'); setCategoria(null); setPerguntas([]); setLink(null); setCopiado(false)
    setOpen(true)
  }

  async function escolherCategoria(c: BriefingCategoria) {
    setCategoria(c)
    setCarregandoTemplate(true)
    try {
      const template = await briefingPerguntasService.getByCategoria(c)
      setPerguntas(template.map(p => ({
        id: p.id!, label: p.label, tipo: p.tipo, obrigatoria: p.obrigatoria, opcoes: p.opcoes, ordem: p.ordem,
      })))
    } catch (e) { console.error(e) }
    finally { setCarregandoTemplate(false) }
    setPasso('personalizar')
  }

  function atualizarPergunta(id: string, patch: Partial<BriefingPerguntaSnapshot>) {
    setPerguntas(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  function removerPergunta(id: string) {
    setPerguntas(ps => ps.filter(p => p.id !== id))
  }

  function moverPergunta(id: string, direcao: -1 | 1) {
    setPerguntas(ps => {
      const idx = ps.findIndex(p => p.id === id)
      const novoIdx = idx + direcao
      if (novoIdx < 0 || novoIdx >= ps.length) return ps
      const copia = [...ps]
      const tmp = copia[idx]; copia[idx] = copia[novoIdx]; copia[novoIdx] = tmp
      return copia.map((p, i) => ({ ...p, ordem: i + 1 }))
    })
  }

  function adicionarPergunta() {
    setPerguntas(ps => [...ps, {
      id: gerarIdLocal(), label: '', tipo: 'texto', obrigatoria: false, ordem: ps.length + 1,
    }])
  }

  async function gerar() {
    if (!categoria || perguntas.some(p => !p.label.trim())) return
    setGerando(true)
    try {
      const token = await briefingLinksService.criar({ categoria, perguntas, leadId, clienteId, nomeAssociado })
      setLink(`${window.location.origin}/briefing/${token}`)
      setPasso('link')
    } catch (e) { console.error(e) }
    finally { setGerando(false) }
  }

  function copiar() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500) })
  }

  const temPerguntaVazia = perguntas.some(p => !p.label.trim())

  return (
    <>
      <button onClick={abrir} className="btn btn-ghost"><ClipboardList size={13} /> Enviar briefing</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setOpen(false)}>
          <div className="card" style={{ width: passo === 'personalizar' ? 'min(560px, 94vw)' : 'min(380px, 94vw)', maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Enviar briefing</div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
            </div>

            {passo === 'categoria' && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Qual serviço?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {CATEGORIAS.map(c => (
                    <button key={c} onClick={() => escolherCategoria(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-input)' }}>
                      <span>{BRIEFING_CATEGORIA_INFO[c].icon}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{BRIEFING_CATEGORIA_INFO[c].label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
                </div>
              </>
            )}

            {passo === 'personalizar' && categoria && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {BRIEFING_CATEGORIA_INFO[categoria].icon} {BRIEFING_CATEGORIA_INFO[categoria].label} — personaliza as perguntas para {nomeAssociado} antes de gerar o link. Isto não altera o modelo padrão da categoria.
                </div>

                {carregandoTemplate ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                    {perguntas.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-faint)', fontSize: 12 }}>Sem perguntas — adiciona uma abaixo.</div>
                    )}
                    {perguntas.map((p, i) => {
                      const temOpcoes = p.tipo === 'escolha_unica' || p.tipo === 'escolha_multipla'
                      return (
                        <div key={p.id} className="card" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                            <input className="input" style={{ flex: 1 }} placeholder="Texto da pergunta"
                              value={p.label} onChange={e => atualizarPergunta(p.id, { label: e.target.value })} />
                            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                              <button onClick={() => moverPergunta(p.id, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', padding: 0, color: 'var(--text-faint)', opacity: i === 0 ? 0.3 : 1 }}><ChevronUp size={13} /></button>
                              <button onClick={() => moverPergunta(p.id, 1)} disabled={i === perguntas.length - 1} style={{ background: 'none', border: 'none', cursor: i === perguntas.length - 1 ? 'default' : 'pointer', padding: 0, color: 'var(--text-faint)', opacity: i === perguntas.length - 1 ? 0.3 : 1 }}><ChevronDown size={13} /></button>
                            </div>
                            <button onClick={() => removerPergunta(p.id)} className="btn btn-danger" style={{ padding: '6px 8px', flexShrink: 0 }}><Trash2 size={12} /></button>
                          </div>
                          <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                            <select className="select" value={p.tipo} onChange={e => atualizarPergunta(p.id, { tipo: e.target.value as BriefingPerguntaTipo })}>
                              {TIPOS.map(t => <option key={t} value={t}>{BRIEFING_TIPO_LABEL[t]}</option>)}
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <input type="checkbox" checked={p.obrigatoria} onChange={e => atualizarPergunta(p.id, { obrigatoria: e.target.checked })} style={{ width: 14, height: 14, accentColor: 'var(--brand)', cursor: 'pointer' }} />
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Obrigatória</span>
                            </label>
                          </div>
                          {temOpcoes && (
                            <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder={'Opção A\nOpção B\nOpção C'}
                              value={(p.opcoes || []).join('\n')}
                              onChange={e => atualizarPergunta(p.id, { opcoes: e.target.value.split('\n').map(o => o.trim()).filter(Boolean) })} />
                          )}
                        </div>
                      )
                    })}
                    <button onClick={adicionarPergunta} className="btn btn-ghost" style={{ justifyContent: 'center' }}><Plus size={13} /> Adicionar pergunta</button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setPasso('categoria')} className="btn btn-ghost">Voltar</button>
                  <button onClick={gerar} disabled={gerando || temPerguntaVazia || perguntas.length === 0} className="btn btn-primary">
                    {gerando ? <Loader2 size={12} className="animate-spin" /> : null} Gerar link
                  </button>
                </div>
              </>
            )}

            {passo === 'link' && link && (
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
