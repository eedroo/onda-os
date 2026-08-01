'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, ExternalLink, CheckSquare, Square } from 'lucide-react'
import { reunioesService, leadsService, clientesService, type Reuniao, type ReuniaoTipo, type ReuniaoStatus, type PlanoRec, type Lead, type Cliente } from '@/lib/db'

const TIPOS: ReuniaoTipo[] = ['ESTRATEGICA', 'KICKOFF', 'ACOMPANHAMENTO', 'RENOVACAO', 'FOLLOWUP']
const STATUS_OPTIONS: ReuniaoStatus[] = ['AGENDADA', 'REALIZADA', 'CANCELADA']
const PLANOS: PlanoRec[] = ['ONE', 'PRESENCE', 'GROWTH', 'PERSONALIZADO']
const FORMATOS = ['Google Meet', 'Presencial', 'Telefone', 'Outro']
const CHECKLIST_POS = [
  { id: 'resumo-enviado', label: 'Enviar resumo por email' },
  { id: 'notas-atualizadas', label: 'Atualizar notas no lead/cliente' },
  { id: 'proxima-agendada', label: 'Agendar próxima ação' },
  { id: 'proposta-preparada', label: 'Preparar proposta' },
]

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }
const fieldStyle: CSSProperties = { marginBottom: 12 }

export default function ReuniaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [reuniao, setReuniao] = useState<Reuniao | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const r = await reunioesService.getById(id)
      setReuniao(r)
      if (r?.leadId) setLead(await leadsService.getById(r.leadId))
      if (r?.clienteId) setCliente(await clientesService.getById(r.clienteId))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function set<K extends keyof Reuniao>(campo: K, valor: Reuniao[K]) {
    setReuniao(prev => prev ? { ...prev, [campo]: valor } : prev)
  }
  async function salvar<K extends keyof Reuniao>(campo: K, valor: Reuniao[K]) {
    await reunioesService.update(id, { [campo]: valor } as Partial<Reuniao>)
  }
  async function toggleChecklist(itemId: string) {
    if (!reuniao) return
    const atual = reuniao.checklistPos || []
    const novo = atual.includes(itemId) ? atual.filter(x => x !== itemId) : [...atual, itemId]
    set('checklistPos', novo)
    await reunioesService.update(id, { checklistPos: novo })
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!reuniao) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Reunião não encontrada</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ArrowLeft size={14} /></button>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Reunião — {reuniao.nomeAssociado}</div>
        </div>
        <select value={reuniao.status} onChange={e => { const v = e.target.value as ReuniaoStatus; set('status', v); salvar('status', v) }} className="select" style={{ width: 140 }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 14, alignItems: 'start' }}>

          {/* Esquerda */}
          <div className="card" style={{ padding: 16 }}>
            <div className="sec-title">Dados da reunião</div>
            {(lead || cliente) && (
              <Link href={lead ? `/leads/${lead.id}` : `/clientes/${cliente!.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, color: 'var(--accent-blue)', marginBottom: 12 }}>
                {reuniao.nomeAssociado} <ExternalLink size={11} />
              </Link>
            )}
            <div style={fieldStyle}>
              <label style={labelStyle}>Tipo</label>
              <select className="select" value={reuniao.tipo} onChange={e => { const v = e.target.value as ReuniaoTipo; set('tipo', v); salvar('tipo', v) }}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><label style={labelStyle}>Data</label><input className="input" type="date" value={reuniao.data} onChange={e => { set('data', e.target.value); salvar('data', e.target.value) }} /></div>
              <div><label style={labelStyle}>Hora</label><input className="input" type="time" value={reuniao.hora} onChange={e => { set('hora', e.target.value); salvar('hora', e.target.value) }} /></div>
            </div>
            <div style={fieldStyle}><label style={labelStyle}>Duração (min)</label><input className="input" type="number" value={reuniao.duracao || ''} onChange={e => set('duracao', Number(e.target.value))} onBlur={e => salvar('duracao', Number(e.target.value))} /></div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Formato</label>
              <select className="select" value={reuniao.formato || ''} onChange={e => { set('formato', e.target.value); salvar('formato', e.target.value) }}>
                <option value="">—</option>
                {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Link Meet</label><input className="input" value={reuniao.linkMeet || ''} onChange={e => set('linkMeet', e.target.value)} onBlur={e => salvar('linkMeet', e.target.value)} /></div>
          </div>

          {/* Centro */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Objetivos</div>
              <textarea className="input" rows={3} value={reuniao.objetivos || ''} onChange={e => set('objetivos', e.target.value)} onBlur={e => salvar('objetivos', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Dores identificadas</div>
              <textarea className="input" rows={3} value={reuniao.dores || ''} onChange={e => set('dores', e.target.value)} onBlur={e => salvar('dores', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Oportunidades</div>
              <textarea className="input" rows={3} value={reuniao.oportunidades || ''} onChange={e => set('oportunidades', e.target.value)} onBlur={e => salvar('oportunidades', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Notas</div>
              <textarea className="input" rows={3} value={reuniao.notas || ''} onChange={e => set('notas', e.target.value)} onBlur={e => salvar('notas', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Direita */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <label style={labelStyle}>Plano sugerido</label>
              <select className="select" value={reuniao.planoSugerido || ''} onChange={e => { const v = e.target.value as PlanoRec; set('planoSugerido', v); salvar('planoSugerido', v) }}>
                <option value="">—</option>
                {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <label style={labelStyle}>Próximo passo</label>
              <input className="input" value={reuniao.proximoPasso || ''} onChange={e => set('proximoPasso', e.target.value)} onBlur={e => salvar('proximoPasso', e.target.value)} placeholder="Ex: Enviar proposta" />
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Checklist pós-reunião</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {CHECKLIST_POS.map(item => {
                  const feito = (reuniao.checklistPos || []).includes(item.id)
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
          </div>

        </div>
      </div>
    </div>
  )
}
