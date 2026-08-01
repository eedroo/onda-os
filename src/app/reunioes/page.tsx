'use client'

import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2, X, Clock } from 'lucide-react'
import { reunioesService, leadsService, clientesService, type Reuniao, type ReuniaoTipo, type Lead, type Cliente } from '@/lib/db'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const TIPOS: { id: ReuniaoTipo; label: string; cor: string }[] = [
  { id: 'ESTRATEGICA', label: 'Estratégica', cor: 'var(--accent-blue)' },
  { id: 'KICKOFF', label: 'Kickoff', cor: 'var(--accent-green)' },
  { id: 'ACOMPANHAMENTO', label: 'Acompanhamento', cor: 'var(--accent-teal)' },
  { id: 'RENOVACAO', label: 'Renovação', cor: 'var(--accent-purple)' },
  { id: 'FOLLOWUP', label: 'Follow-up', cor: 'var(--accent-amber)' },
]
const TIPO_COR: Record<ReuniaoTipo, string> = Object.fromEntries(TIPOS.map(t => [t.id, t.cor])) as Record<ReuniaoTipo, string>
const FORMATOS = ['Google Meet', 'Presencial', 'Telefone', 'Outro']

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }
function pad(n: number) { return String(n).padStart(2, '0') }
function hojeISO() { return new Date().toISOString().slice(0, 10) }

function ReunioesConteudo() {
  const searchParams = useSearchParams()
  const [reunioes, setReunioes] = useState<Reuniao[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [showModal, setShowModal] = useState(searchParams.get('novo') === '1')
  const leadIdPreset = searchParams.get('leadId') || ''

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [r, l, c] = await Promise.all([reunioesService.getAll(), leadsService.getAll(), clientesService.getAll()])
      setReunioes(r)
      setLeads(l)
      setClientes(c)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function handleCriada(nova: Reuniao) {
    setReunioes(prev => [...prev, nova])
    setShowModal(false)
  }

  const diasNoMes = new Date(ano, mes, 0).getDate()
  const diaSemanaInicio = new Date(ano, mes - 1, 1).getDay()
  const chaveMes = `${ano}-${pad(mes)}`
  const porDia: Record<number, Reuniao[]> = {}
  reunioes.filter(r => r.data?.startsWith(chaveMes)).forEach(r => {
    const dia = Number(r.data.split('-')[2])
    porDia[dia] = [...(porDia[dia] || []), r]
  })
  const celulas: (number | null)[] = [...Array(diaSemanaInicio).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]

  const hojeStr = hojeISO()
  const { reunioesHoje, proximas } = useMemo(() => {
    const futuras = [...reunioes].filter(r => r.status !== 'CANCELADA' && r.data >= hojeStr).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    return {
      reunioesHoje: futuras.filter(r => r.data === hojeStr),
      proximas: futuras.filter(r => r.data > hojeStr).slice(0, 5),
    }
  }, [reunioes, hojeStr])

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
          <CalendarDays size={18} style={{ color: 'var(--accent-blue)' }} /> Reuniões
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={13} /> Nova reunião</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: 14, alignItems: 'start' }}>

          <div className="card" style={{ padding: 16, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <button onClick={() => { if (mes === 1) { setMes(12); setAno(a => a - 1) } else setMes(m => m - 1) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronLeft size={13} /></button>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 120, textAlign: 'center' }}>{MESES[mes - 1]} {ano}</div>
              <button onClick={() => { if (mes === 12) { setMes(1); setAno(a => a + 1) } else setMes(m => m + 1) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronRight size={13} /></button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              {TIPOS.map(t => (
                <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: t.cor }} /> {t.label}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {DIAS_SEMANA.map(d => <div key={d} style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>)}
              {celulas.map((dia, i) => (
                <div key={i} style={{ minHeight: 78, borderRadius: 6, padding: 4, backgroundColor: dia ? 'var(--bg-card)' : 'transparent', border: dia ? '1px solid var(--border-subtle)' : 'none' }}>
                  {dia && (
                    <>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 3 }}>{dia}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {(porDia[dia] || []).map(r => (
                          <Link key={r.id} href={`/reunioes/${r.id}`} title={`${r.hora} — ${r.nomeAssociado}`}
                            style={{ display: 'block', fontSize: 9, padding: '2px 4px', borderRadius: 3, backgroundColor: `color-mix(in srgb, ${TIPO_COR[r.tipo]} 18%, transparent)`, color: TIPO_COR[r.tipo], textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: r.status === 'CANCELADA' ? 0.5 : 1 }}>
                            {r.hora} {r.nomeAssociado}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Hoje</div>
              {reunioesHoje.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {reunioesHoje.map(r => (
                    <Link key={r.id} href={`/reunioes/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none', borderLeft: `2px solid ${TIPO_COR[r.tipo]}` }}>
                      <Clock size={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nomeAssociado}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{r.hora}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Sem reuniões hoje</div>}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Próximas</div>
              {proximas.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {proximas.map(r => (
                    <Link key={r.id} href={`/reunioes/${r.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nomeAssociado}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', flexShrink: 0, marginLeft: 6 }}>{r.data.slice(8, 10)}/{r.data.slice(5, 7)}</span>
                    </Link>
                  ))}
                </div>
              ) : <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Sem próximas reuniões</div>}
            </div>
          </div>
        </div>
      </div>

      {showModal && <ModalNovaReuniao leads={leads} clientes={clientes} leadIdPreset={leadIdPreset} onClose={() => setShowModal(false)} onCreated={handleCriada} />}
    </div>
  )
}

function ModalNovaReuniao({ leads, clientes, leadIdPreset, onClose, onCreated }: { leads: Lead[]; clientes: Cliente[]; leadIdPreset: string; onClose: () => void; onCreated: (r: Reuniao) => void }) {
  const [associado, setAssociado] = useState(leadIdPreset ? `lead:${leadIdPreset}` : '')
  const [tipo, setTipo] = useState<ReuniaoTipo>('ESTRATEGICA')
  const [data, setData] = useState(hojeISO())
  const [hora, setHora] = useState('10:00')
  const [duracao, setDuracao] = useState(30)
  const [formato, setFormato] = useState(FORMATOS[0])
  const [linkMeet, setLinkMeet] = useState('')
  const [objetivos, setObjetivos] = useState('')
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  const valido = !!associado && !!data && !!hora

  async function guardar() {
    if (!valido) return
    setSalvando(true)
    try {
      const [tipoAssoc, entidadeId] = associado.split(':')
      const nomeAssociado = tipoAssoc === 'lead'
        ? leads.find(l => l.id === entidadeId)?.empresa || ''
        : clientes.find(c => c.id === entidadeId)?.empresa || ''
      const dados: Omit<Reuniao, 'id' | 'createdAt'> = {
        leadId: tipoAssoc === 'lead' ? entidadeId : undefined,
        clienteId: tipoAssoc === 'cliente' ? entidadeId : undefined,
        nomeAssociado, tipo, status: 'AGENDADA', data, hora, duracao,
        formato, linkMeet: linkMeet.trim() || undefined,
        objetivos: objetivos.trim() || undefined, notas: notas.trim() || undefined,
      }
      const id = await reunioesService.create(dados)
      if (tipoAssoc === 'lead' && entidadeId) await leadsService.updateStatus(entidadeId, 'REUNIAO')
      onCreated({ id, ...dados })
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 440, maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Nova reunião</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Associado a *</label>
            <select className="select" value={associado} onChange={e => setAssociado(e.target.value)}>
              <option value="">Selecionar…</option>
              <optgroup label="Leads">
                {leads.map(l => <option key={l.id} value={`lead:${l.id}`}>{l.empresa}</option>)}
              </optgroup>
              <optgroup label="Clientes">
                {clientes.map(c => <option key={c.id} value={`cliente:${c.id}`}>{c.empresa}</option>)}
              </optgroup>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Tipo</label>
            <select className="select" value={tipo} onChange={e => setTipo(e.target.value as ReuniaoTipo)}>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>Data *</label><input className="input" type="date" value={data} onChange={e => setData(e.target.value)} /></div>
            <div><label style={labelStyle}>Hora *</label><input className="input" type="time" value={hora} onChange={e => setHora(e.target.value)} /></div>
            <div><label style={labelStyle}>Duração (min)</label><input className="input" type="number" min="0" step="5" value={duracao} onChange={e => setDuracao(Number(e.target.value))} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Formato</label>
              <select className="select" value={formato} onChange={e => setFormato(e.target.value)}>
                {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Link Meet</label><input className="input" value={linkMeet} onChange={e => setLinkMeet(e.target.value)} placeholder="https://meet.google.com/..." /></div>
          </div>

          <div><label style={labelStyle}>Objetivos</label><textarea className="input" rows={2} value={objetivos} onChange={e => setObjetivos(e.target.value)} style={{ resize: 'vertical' }} /></div>
          <div><label style={labelStyle}>Notas</label><textarea className="input" rows={2} value={notas} onChange={e => setNotas(e.target.value)} style={{ resize: 'vertical' }} /></div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button onClick={guardar} disabled={!valido || salvando} className="btn btn-primary" style={{ opacity: (!valido || salvando) ? 0.6 : 1 }}>
            {salvando ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReunioesPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>}>
      <ReunioesConteudo />
    </Suspense>
  )
}
