'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { FileSignature, Plus, Loader2, X, ExternalLink, Trash2 } from 'lucide-react'
import { contratosService, leadsService, clientesService, type Contrato, type ContratoStatus, type PlanoRec, type Lead, type Cliente } from '@/lib/db'

const STATUS_PILL: Record<ContratoStatus, { label: string; cls: string }> = {
  RASCUNHO: { label: 'Rascunho', cls: 'pill-gray' },
  ENVIADO: { label: 'Enviado', cls: 'pill-amber' },
  ASSINADO: { label: 'Assinado', cls: 'pill-green' },
  CANCELADO: { label: 'Cancelado', cls: 'pill-red' },
}
const STATUS_OPTIONS: ContratoStatus[] = ['RASCUNHO', 'ENVIADO', 'ASSINADO', 'CANCELADO']
const PLANOS: PlanoRec[] = ['ONE', 'PRESENCE', 'GROWTH', 'PERSONALIZADO']

const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }
function formatarDataPt(iso?: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [c, l, cl] = await Promise.all([contratosService.getAll(), leadsService.getAll(), clientesService.getAll()])
      setContratos(c.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
      setLeads(l)
      setClientes(cl)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function mudarStatus(id: string, status: ContratoStatus) {
    setContratos(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    await contratosService.update(id, { status })
  }
  async function remover(id: string) {
    if (!confirm('Eliminar este contrato?')) return
    setContratos(prev => prev.filter(c => c.id !== id))
    await contratosService.delete(id)
  }
  function handleCriado(novo: Contrato) {
    setContratos(prev => [novo, ...prev])
    setShowModal(false)
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
          <FileSignature size={18} style={{ color: 'var(--accent-blue)' }} /> Contratos
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={13} /> Novo contrato</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Cliente/Lead', 'Plano', 'Valor', 'Status', 'Início', 'Fim', 'Documento', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contratos.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{c.nomeAssociado}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{c.plano}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(c.valor)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <select value={c.status} onChange={e => mudarStatus(c.id!, e.target.value as ContratoStatus)}
                        className={`pill ${STATUS_PILL[c.status].cls}`} style={{ border: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_PILL[s].label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{formatarDataPt(c.dataInicio)}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{formatarDataPt(c.dataFim)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      {c.documentoUrl ? <a href={c.documentoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>Abrir <ExternalLink size={10} /></a> : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <button onClick={() => remover(c.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
                {contratos.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-faint)' }}>Sem contratos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && <ModalNovoContrato leads={leads} clientes={clientes} onClose={() => setShowModal(false)} onCreated={handleCriado} />}
    </div>
  )
}

function ModalNovoContrato({ leads, clientes, onClose, onCreated }: { leads: Lead[]; clientes: Cliente[]; onClose: () => void; onCreated: (c: Contrato) => void }) {
  const [associado, setAssociado] = useState('')
  const [plano, setPlano] = useState<PlanoRec>('PRESENCE')
  const [valor, setValor] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [documentoUrl, setDocumentoUrl] = useState('')
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  const valido = !!associado && Number(valor) > 0

  async function guardar() {
    if (!valido) return
    setSalvando(true)
    try {
      const [tipoAssoc, entidadeId] = associado.split(':')
      const nomeAssociado = tipoAssoc === 'lead'
        ? leads.find(l => l.id === entidadeId)?.empresa || ''
        : clientes.find(c => c.id === entidadeId)?.empresa || ''
      const dados: Omit<Contrato, 'id' | 'createdAt'> = {
        leadId: tipoAssoc === 'lead' ? entidadeId : undefined,
        clienteId: tipoAssoc === 'cliente' ? entidadeId : undefined,
        nomeAssociado, plano, valor: Number(valor), status: 'RASCUNHO',
        dataInicio: dataInicio || undefined, dataFim: dataFim || undefined,
        documentoUrl: documentoUrl.trim() || undefined, notas: notas.trim() || undefined,
      }
      const id = await contratosService.create(dados)
      onCreated({ id, ...dados })
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 420, maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Novo contrato</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Associado a *</label>
            <select className="select" value={associado} onChange={e => setAssociado(e.target.value)}>
              <option value="">Selecionar…</option>
              <optgroup label="Leads">{leads.map(l => <option key={l.id} value={`lead:${l.id}`}>{l.empresa}</option>)}</optgroup>
              <optgroup label="Clientes">{clientes.map(c => <option key={c.id} value={`cliente:${c.id}`}>{c.empresa}</option>)}</optgroup>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Plano</label>
              <select className="select" value={plano} onChange={e => setPlano(e.target.value as PlanoRec)}>
                {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Valor mensal (€) *</label><input className="input" type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>Data início</label><input className="input" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
            <div><label style={labelStyle}>Data fim</label><input className="input" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Link do documento</label><input className="input" value={documentoUrl} onChange={e => setDocumentoUrl(e.target.value)} placeholder="https://..." /></div>
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
