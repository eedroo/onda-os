'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, CheckCircle2 } from 'lucide-react'
import {
  briefingLinksService, briefingRespostasService,
  BRIEFING_CATEGORIA_INFO,
  type BriefingLink, type BriefingPerguntaSnapshot, type BriefingRespostaItem,
} from '@/lib/db'

const labelStyle: CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }

function Cartao({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', backgroundColor: 'var(--bg-base)', padding: '40px 20px' }}>
      <div className="card" style={{ padding: 28, width: '100%', maxWidth: 560, height: 'fit-content' }}>
        {children}
      </div>
    </div>
  )
}

export default function BriefingPublicoPage() {
  const { token } = useParams<{ token: string }>()
  const [link, setLink] = useState<BriefingLink | null>(null)
  const [perguntas, setPerguntas] = useState<BriefingPerguntaSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [respostas, setRespostas] = useState<Record<string, string | string[]>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const l = await briefingLinksService.getByToken(token)
        if (!l) { setNaoEncontrado(true); setLoading(false); return }
        setLink(l)
        if (l.status === 'RESPONDIDO') { setEnviado(true); setLoading(false); return }
        setPerguntas((l.perguntas || []).sort((a, b) => a.ordem - b.ordem))
      } catch (e) { console.error(e); setNaoEncontrado(true) }
      finally { setLoading(false) }
    }
    load()
  }, [token])

  function setValor(perguntaId: string, valor: string | string[]) {
    setRespostas(r => ({ ...r, [perguntaId]: valor }))
  }

  function toggleMultipla(perguntaId: string, opcao: string) {
    setRespostas(r => {
      const atual = (r[perguntaId] as string[]) || []
      const novo = atual.includes(opcao) ? atual.filter(o => o !== opcao) : [...atual, opcao]
      return { ...r, [perguntaId]: novo }
    })
  }

  function podeEnviar() {
    return perguntas.filter(p => p.obrigatoria).every(p => {
      const v = respostas[p.id!]
      if (Array.isArray(v)) return v.length > 0
      return !!(v && String(v).trim())
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!link || !podeEnviar()) { setErro('Preenche todas as perguntas obrigatórias.'); return }
    setErro(null)
    setEnviando(true)
    try {
      const itens: BriefingRespostaItem[] = perguntas.map(p => ({
        perguntaId: p.id!, label: p.label, valor: respostas[p.id!] ?? (p.tipo === 'escolha_multipla' ? [] : ''),
      }))
      await briefingRespostasService.create({
        linkId: token, categoria: link.categoria, clienteId: link.clienteId, leadId: link.leadId,
        nomeAssociado: link.nomeAssociado, respostas: itens,
      })
      await briefingLinksService.marcarRespondido(token)
      setEnviado(true)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível enviar. Tenta novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return (
    <Cartao><div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div></Cartao>
  )

  if (naoEncontrado) return (
    <Cartao>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Link inválido</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Este link de briefing não existe ou foi removido. Contacta quem to enviou.</div>
      </div>
    </Cartao>
  )

  if (enviado) return (
    <Cartao>
      <div style={{ textAlign: 'center' }}>
        <CheckCircle2 size={36} style={{ color: 'var(--accent-green)', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Obrigado!</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Recebemos as tuas respostas. Entraremos em contacto em breve.</div>
      </div>
    </Cartao>
  )

  const info = link ? BRIEFING_CATEGORIA_INFO[link.categoria] : null

  return (
    <Cartao>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 auto 10px' }}>O</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{info ? `${info.icon} Briefing — ${info.label}` : 'Briefing'}</div>
          {link?.nomeAssociado && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{link.nomeAssociado}</div>}
        </div>

        {perguntas.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}>Este formulário ainda não tem perguntas configuradas.</div>
        ) : perguntas.map(p => (
          <div key={p.id}>
            <label style={labelStyle}>{p.label}{p.obrigatoria && <span style={{ color: 'var(--accent-red)' }}> *</span>}</label>
            {p.tipo === 'texto' && (
              <input className="input" value={(respostas[p.id!] as string) || ''} onChange={e => setValor(p.id!, e.target.value)} />
            )}
            {p.tipo === 'link' && (
              <input className="input" type="url" placeholder="https://..." value={(respostas[p.id!] as string) || ''} onChange={e => setValor(p.id!, e.target.value)} />
            )}
            {p.tipo === 'textarea' && (
              <textarea className="input" rows={4} style={{ resize: 'vertical' }} value={(respostas[p.id!] as string) || ''} onChange={e => setValor(p.id!, e.target.value)} />
            )}
            {p.tipo === 'escolha_unica' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(p.opcoes || []).map(op => (
                  <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 8, border: `1px solid ${respostas[p.id!] === op ? 'var(--brand)' : 'var(--border-subtle)'}`, cursor: 'pointer' }}>
                    <input type="radio" name={p.id} checked={respostas[p.id!] === op} onChange={() => setValor(p.id!, op)} style={{ accentColor: 'var(--brand)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{op}</span>
                  </label>
                ))}
              </div>
            )}
            {p.tipo === 'escolha_multipla' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(p.opcoes || []).map(op => {
                  const marcado = ((respostas[p.id!] as string[]) || []).includes(op)
                  return (
                    <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 8, border: `1px solid ${marcado ? 'var(--brand)' : 'var(--border-subtle)'}`, cursor: 'pointer' }}>
                      <input type="checkbox" checked={marcado} onChange={() => toggleMultipla(p.id!, op)} style={{ accentColor: 'var(--brand)' }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{op}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {erro && <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>{erro}</div>}

        {perguntas.length > 0 && (
          <button type="submit" disabled={enviando} className="btn btn-primary" style={{ justifyContent: 'center' }}>
            {enviando ? <Loader2 size={13} className="animate-spin" /> : null} Enviar respostas
          </button>
        )}
      </form>
    </Cartao>
  )
}
