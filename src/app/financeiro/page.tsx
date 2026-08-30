'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Wallet, LayoutGrid, ArrowUpCircle, ArrowDownCircle, Plus, X, Loader2, Pencil,
  ChevronLeft, ChevronRight, Package, Server, Cpu, Megaphone, Users, MoreHorizontal,
  AlertTriangle, Target, CheckCircle2,
} from 'lucide-react'
import {
  financeiroService, clientesService,
  type Receita, type Despesa, type Cliente, type EstadoPagamento,
} from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DatePicker } from '@/components/ui/DatePicker'

// ─── Constantes ─────────────────────────────────────────────────────────────
const META_MRR_DEFAULT = 2000
const META_CLIENTES = 10
const LS_META_MRR = 'onda-os-meta-mrr'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MESES_ABR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const TIPOS_RECEITA = ['Mensalidade', 'Projeto único', 'Add-on', 'Outro']
const METODOS_RECEITA = ['Transferência', 'MB', 'MBWay', 'Outro']
const METODOS_DESPESA = ['Cartão', 'Transferência', 'PayPal', 'Outro']

const CATEGORIAS_DESPESA = [
  { id: 'Software', label: 'Software', icon: Package },
  { id: 'Hosting', label: 'Hosting', icon: Server },
  { id: 'IA', label: 'IA', icon: Cpu },
  { id: 'Marketing', label: 'Marketing', icon: Megaphone },
  { id: 'Serviços', label: 'Serviços', icon: Users },
  { id: 'Outro', label: 'Outro', icon: MoreHorizontal },
]

const ESTADO_PILL: Record<EstadoPagamento, { label: string; cls: string }> = {
  PAGO: { label: 'Pago', cls: 'pill-green' },
  AGUARDA: { label: 'Aguarda', cls: 'pill-amber' },
  ATRASO: { label: 'Atraso', cls: 'pill-red' },
  CANCELADO: { label: 'Cancelado', cls: 'pill-gray' },
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'receitas', label: 'Receitas', icon: ArrowUpCircle },
  { id: 'despesas', label: 'Despesas', icon: ArrowDownCircle },
] as const
type TabId = typeof TABS[number]['id']

const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function hojeISO() { return new Date().toISOString().slice(0, 10) }
function pad(n: number) { return String(n).padStart(2, '0') }
function formatarDataPt(iso?: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function mesAnterior(mes: number, ano: number) { return mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano } }
function mesSeguinte(mes: number, ano: number) { return mes === 12 ? { mes: 1, ano: ano + 1 } : { mes: mes + 1, ano } }

function BarraProgresso({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div style={{ width: '100%', height: 5, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: cor, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <span style={{ width: 34, height: 19, borderRadius: 10, backgroundColor: checked ? 'var(--brand)' : 'var(--bg-input)', border: `1px solid ${checked ? 'var(--brand)' : 'var(--border-subtle)'}`, position: 'relative', transition: 'background-color 0.15s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 1, left: checked ? 16 : 1, width: 15, height: 15, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.15s' }} />
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </button>
  )
}

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }
const thStyle: CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', fontWeight: 500, whiteSpace: 'nowrap' }
const tdStyle: CSSProperties = { padding: '9px 12px', color: 'var(--text-secondary)', fontSize: 12 }

// ─── Página ─────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [loading, setLoading] = useState(true)
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [metaMrr, setMetaMrr] = useState(META_MRR_DEFAULT)
  const [editandoMeta, setEditandoMeta] = useState(false)

  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1
  const chaveMesAtual = `${anoAtual}-${pad(mesAtual)}`

  const [mesReceitas, setMesReceitas] = useState(mesAtual)
  const [anoReceitas, setAnoReceitas] = useState(anoAtual)
  const [mesDespesas, setMesDespesas] = useState(mesAtual)
  const [anoDespesas, setAnoDespesas] = useState(anoAtual)

  const [estadoAbertoId, setEstadoAbertoId] = useState<string | null>(null)
  const [showModalReceita, setShowModalReceita] = useState(false)
  const [showModalDespesa, setShowModalDespesa] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(LS_META_MRR)
    if (saved) setMetaMrr(Number(saved))
    load()
  }, [])

  async function load() {
    try {
      const [r, d, c] = await Promise.all([financeiroService.getReceitas(), financeiroService.getDespesas(), clientesService.getAll()])
      setReceitas(r)
      setDespesas(d)
      setClientes(c)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function guardarMeta(v: number) {
    const val = v > 0 ? v : metaMrr
    setMetaMrr(val)
    localStorage.setItem(LS_META_MRR, String(val))
    setEditandoMeta(false)
  }

  async function marcarReceitaPaga(id: string) {
    setReceitas(prev => prev.map(r => r.id === id ? { ...r, estado: 'PAGO' } : r))
    setEstadoAbertoId(null)
    await financeiroService.updateReceita(id, { estado: 'PAGO' })
  }

  function handleReceitaCriada(nova: Receita) {
    setReceitas(prev => [nova, ...prev])
    setShowModalReceita(false)
  }
  function handleDespesaCriada(nova: Despesa) {
    setDespesas(prev => [nova, ...prev])
    setShowModalDespesa(false)
  }

  // ── Derivados: dashboard (mês corrente real) ──
  const receitasMesAtual = useMemo(() => receitas.filter(r => r.data?.startsWith(chaveMesAtual)), [receitas, chaveMesAtual])
  const despesasMesAtual = useMemo(() => despesas.filter(d => d.data?.startsWith(chaveMesAtual)), [despesas, chaveMesAtual])

  const mrrAtual = useMemo(() => receitasMesAtual.filter(r => r.recorrente && r.estado !== 'CANCELADO').reduce((s, r) => s + r.valor, 0), [receitasMesAtual])
  const receitaMes = useMemo(() => receitasMesAtual.filter(r => r.estado !== 'CANCELADO').reduce((s, r) => s + r.valor, 0), [receitasMesAtual])
  const despesaMes = useMemo(() => despesasMesAtual.filter(d => d.estado !== 'CANCELADO').reduce((s, d) => s + d.valor, 0), [despesasMesAtual])
  const lucroMes = receitaMes - despesaMes

  const clientesAtivos = useMemo(() => clientes.filter(c => c.status === 'ATIVO').length, [clientes])
  const receitaAno = useMemo(() => receitas.filter(r => r.data?.startsWith(String(anoAtual)) && r.estado !== 'CANCELADO').reduce((s, r) => s + r.valor, 0), [receitas, anoAtual])

  const mrrPorTipo = useMemo(() => {
    const grupos: Record<string, number> = {}
    receitasMesAtual.filter(r => r.recorrente && r.estado !== 'CANCELADO').forEach(r => { grupos[r.tipo] = (grupos[r.tipo] || 0) + r.valor })
    return Object.entries(grupos).sort((a, b) => b[1] - a[1])
  }, [receitasMesAtual])

  const alertas = useMemo(() =>
    [...receitasMesAtual]
      .filter(r => r.estado === 'AGUARDA' || r.estado === 'ATRASO')
      .sort((a, b) => (a.estado === b.estado ? 0 : a.estado === 'ATRASO' ? -1 : 1)),
    [receitasMesAtual])

  const numClientesPagantes = useMemo(() => new Set(receitasMesAtual.filter(r => r.recorrente && r.estado !== 'CANCELADO').map(r => r.clienteId)).size, [receitasMesAtual])
  const ticketMedio = numClientesPagantes > 0 ? mrrAtual / numClientesPagantes : 0
  const gapMrr = Math.max(0, metaMrr - mrrAtual)
  const clientesQueFaltam = ticketMedio > 0 ? Math.ceil(gapMrr / ticketMedio) : null

  const chartData = useMemo(() => {
    const meses: { label: string; chave: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - 1 - i, 1)
      meses.push({ label: MESES_ABR[d.getMonth()], chave: `${d.getFullYear()}-${pad(d.getMonth() + 1)}` })
    }
    return meses.map(m => ({
      mes: m.label,
      Receita: receitas.filter(r => r.data?.startsWith(m.chave) && r.estado !== 'CANCELADO').reduce((s, r) => s + r.valor, 0),
      Despesa: despesas.filter(d => d.data?.startsWith(m.chave) && d.estado !== 'CANCELADO').reduce((s, d) => s + d.valor, 0),
    }))
  }, [receitas, despesas, anoAtual, mesAtual])
  const maxChart = Math.max(1, ...chartData.map(m => Math.max(m.Receita, m.Despesa)))

  // ── Derivados: tabs de tabelas (mês navegável) ──
  const receitasDoMesTab = useMemo(() => {
    const chave = `${anoReceitas}-${pad(mesReceitas)}`
    return receitas.filter(r => r.data?.startsWith(chave)).sort((a, b) => b.data.localeCompare(a.data))
  }, [receitas, mesReceitas, anoReceitas])
  const totalReceitasTab = receitasDoMesTab.filter(r => r.estado !== 'CANCELADO').reduce((s, r) => s + r.valor, 0)

  const despesasDoMesTab = useMemo(() => {
    const chave = `${anoDespesas}-${pad(mesDespesas)}`
    return despesas.filter(d => d.data?.startsWith(chave)).sort((a, b) => b.data.localeCompare(a.data))
  }, [despesas, mesDespesas, anoDespesas])
  const totalDespesasTab = despesasDoMesTab.filter(d => d.estado !== 'CANCELADO').reduce((s, d) => s + d.valor, 0)

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Financeiro" icon={Wallet} actions={<>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: tab === t.id ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: tab === t.id ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
      </>} />

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
              <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-blue)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>MRR</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(mrrAtual)}</div>
              </div>
              <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-green)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Receita do mês</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-green)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(receitaMes)}</div>
              </div>
              <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-red)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Despesas do mês</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-red)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(despesaMes)}</div>
              </div>
              <div className="card" style={{ padding: '12px 14px', borderTop: `2px solid ${lucroMes >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Lucro do mês</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: lucroMes >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(lucroMes)}</div>
              </div>
              <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-amber)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Meta MRR</div>
                  <button onClick={() => setEditandoMeta(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0 }}><Pencil size={11} /></button>
                </div>
                {editandoMeta ? (
                  <input type="number" autoFocus defaultValue={metaMrr}
                    onKeyDown={e => { if (e.key === 'Enter') guardarMeta(Number((e.target as HTMLInputElement).value)); if (e.key === 'Escape') setEditandoMeta(false) }}
                    onBlur={e => guardarMeta(Number(e.target.value))}
                    className="input" style={{ fontSize: 14, padding: '4px 8px' }} />
                ) : (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-amber)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(metaMrr)}</div>
                    <div style={{ marginTop: 6 }}><BarraProgresso pct={(mrrAtual / metaMrr) * 100} cor="var(--accent-amber)" /></div>
                  </>
                )}
              </div>
            </div>

            <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, alignItems: 'start' }}>
              {/* Gráfico */}
              <div className="card" style={{ padding: 16, minWidth: 0 }}>
                <div className="sec-title">Receita vs. Despesa — últimos 6 meses</div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}><span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--accent-green)' }} />Receita</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}><span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--accent-red)' }} />Despesa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180, padding: '0 4px' }}>
                  {chartData.map(m => (
                    <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%' }}>
                        <div title={`Receita: ${fmtEUR.format(m.Receita)}`} style={{ width: 14, height: `${Math.max(2, (m.Receita / maxChart) * 100)}%`, backgroundColor: 'var(--accent-green)', borderRadius: '3px 3px 0 0' }} />
                        <div title={`Despesa: ${fmtEUR.format(m.Despesa)}`} style={{ width: 14, height: `${Math.max(2, (m.Despesa / maxChart) * 100)}%`, backgroundColor: 'var(--accent-red)', borderRadius: '3px 3px 0 0' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{m.mes}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div className="sec-title"><Target size={11} /> Metas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>MRR</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(mrrAtual)} / {fmtEUR.format(metaMrr)}</span>
                      </div>
                      <BarraProgresso pct={(mrrAtual / metaMrr) * 100} cor="var(--accent-blue)" />
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>
                        {gapMrr === 0 ? 'Meta atingida 🎉' : clientesQueFaltam
                          ? `Faltam ${clientesQueFaltam} cliente${clientesQueFaltam > 1 ? 's' : ''} a ~${fmtEUR.format(ticketMedio)}/mês`
                          : 'Ainda sem clientes recorrentes este mês'}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Clientes activos</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{clientesAtivos} / {META_CLIENTES}</span>
                      </div>
                      <BarraProgresso pct={(clientesAtivos / META_CLIENTES) * 100} cor="var(--accent-purple)" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Receita acumulada ({anoAtual})</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(receitaAno)}</span>
                      </div>
                      <BarraProgresso pct={(receitaAno / (metaMrr * 12)) * 100} cor="var(--accent-green)" />
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <div className="sec-title">MRR por tipo</div>
                  {mrrPorTipo.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {mrrPorTipo.map(([tipo, total]) => (
                        <div key={tipo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tipo}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(total)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '10px 0' }}>Sem receitas recorrentes este mês</div>
                  )}
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <div className="sec-title"><AlertTriangle size={11} /> Alertas financeiros</div>
                  {alertas.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {alertas.map(a => (
                        <button key={a.id} onClick={() => { const [ay, am] = a.data.split('-').map(Number); setAnoReceitas(ay); setMesReceitas(am); setTab('receitas') }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left', backgroundColor: a.estado === 'ATRASO' ? 'var(--pill-red-bg)' : 'var(--pill-amber-bg)', borderLeft: `2px solid ${a.estado === 'ATRASO' ? 'var(--accent-red)' : 'var(--accent-amber)'}` }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.clienteNome || a.descricao}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: a.estado === 'ATRASO' ? 'var(--accent-red)' : 'var(--accent-amber)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtEUR.format(a.valor)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-faint)', padding: '10px 0', justifyContent: 'center' }}>
                      <CheckCircle2 size={13} style={{ color: 'var(--accent-green)' }} /> Sem pendências este mês
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Receitas ── */}
        {tab === 'receitas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => { const { mes, ano } = mesAnterior(mesReceitas, anoReceitas); setMesReceitas(mes); setAnoReceitas(ano) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronLeft size={13} /></button>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 120, textAlign: 'center' }}>{MESES[mesReceitas - 1]} {anoReceitas}</div>
                <button onClick={() => { const { mes, ano } = mesSeguinte(mesReceitas, anoReceitas); setMesReceitas(mes); setAnoReceitas(ano) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronRight size={13} /></button>
              </div>
              <button onClick={() => setShowModalReceita(true)} className="btn btn-primary"><Plus size={13} /> Nova receita</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={thStyle}>Cliente</th>
                      <th style={thStyle}>Descrição</th>
                      <th style={thStyle}>Tipo</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                      <th style={thStyle}>Data</th>
                      <th style={thStyle}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receitasDoMesTab.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={tdStyle}>{r.clienteNome || '—'}</td>
                        <td style={tdStyle}>{r.descricao}</td>
                        <td style={tdStyle}>{r.tipo}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(r.valor)}</td>
                        <td style={tdStyle}>{formatarDataPt(r.data)}</td>
                        <td style={tdStyle}>
                          {estadoAbertoId === r.id ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => marcarReceitaPaga(r.id!)} className="btn btn-primary" style={{ fontSize: 10, padding: '3px 8px' }}>Marcar como pago</button>
                              <button onClick={() => setEstadoAbertoId(null)} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 7px' }}>×</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => (r.estado === 'AGUARDA' || r.estado === 'ATRASO') && setEstadoAbertoId(r.id!)}
                              className={`pill ${ESTADO_PILL[r.estado].cls}`}
                              style={{ border: 'none', cursor: (r.estado === 'AGUARDA' || r.estado === 'ATRASO') ? 'pointer' : 'default' }}>
                              {ESTADO_PILL[r.estado].label}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {receitasDoMesTab.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>Sem receitas neste mês</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {receitasDoMesTab.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
                  Total do mês: <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(totalReceitasTab)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Despesas ── */}
        {tab === 'despesas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => { const { mes, ano } = mesAnterior(mesDespesas, anoDespesas); setMesDespesas(mes); setAnoDespesas(ano) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronLeft size={13} /></button>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 120, textAlign: 'center' }}>{MESES[mesDespesas - 1]} {anoDespesas}</div>
                <button onClick={() => { const { mes, ano } = mesSeguinte(mesDespesas, anoDespesas); setMesDespesas(mes); setAnoDespesas(ano) }} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ChevronRight size={13} /></button>
              </div>
              <button onClick={() => setShowModalDespesa(true)} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}><Plus size={13} /> Nova despesa</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={thStyle}>Descrição</th>
                      <th style={thStyle}>Categoria</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                      <th style={thStyle}>Data</th>
                      <th style={thStyle}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesasDoMesTab.map(d => {
                      const cat = CATEGORIAS_DESPESA.find(c => c.id === d.categoria)
                      const Icon = cat?.icon || MoreHorizontal
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={tdStyle}>{d.descricao}</td>
                          <td style={tdStyle}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon size={12} style={{ color: 'var(--text-faint)' }} />{d.categoria}</span></td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(d.valor)}</td>
                          <td style={tdStyle}>{formatarDataPt(d.data)}</td>
                          <td style={tdStyle}><span className={`pill ${ESTADO_PILL[d.estado].cls}`}>{ESTADO_PILL[d.estado].label}</span></td>
                        </tr>
                      )
                    })}
                    {despesasDoMesTab.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>Sem despesas neste mês</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {despesasDoMesTab.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
                  Total do mês: <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtEUR.format(totalDespesasTab)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModalReceita && <ModalNovaReceita clientes={clientes} onClose={() => setShowModalReceita(false)} onCreated={handleReceitaCriada} />}
      {showModalDespesa && <ModalNovaDespesa onClose={() => setShowModalDespesa(false)} onCreated={handleDespesaCriada} />}
    </div>
  )
}

// ─── Modal: Nova Receita ────────────────────────────────────────────────────
function ModalNovaReceita({ clientes, onClose, onCreated }: { clientes: Cliente[]; onClose: () => void; onCreated: (r: Receita) => void }) {
  const [clienteId, setClienteId] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState(TIPOS_RECEITA[0])
  const [metodoPagamento, setMetodoPagamento] = useState(METODOS_RECEITA[0])
  const [estado, setEstado] = useState<EstadoPagamento>('PAGO')
  const [recorrente, setRecorrente] = useState(false)
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  const valido = !!clienteId && Number(valor) > 0 && !!descricao.trim() && !!data

  async function guardar() {
    if (!valido) return
    setSalvando(true)
    try {
      const cliente = clientes.find(c => c.id === clienteId)
      const dados: Omit<Receita, 'id' | 'createdAt'> = {
        clienteId, clienteNome: cliente?.empresa, descricao: descricao.trim(), tipo,
        valor: Number(valor), data, estado, recorrente, metodoPagamento,
        notas: notas.trim() || undefined,
      }
      const id = await financeiroService.createReceita(dados)
      onCreated({ id, ...dados })
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 'min(440px, 94vw)', maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Nova receita</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Cliente *</label>
            <select className="select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Selecionar cliente…</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa}</option>)}
            </select>
          </div>

          <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Valor (€) *</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Data *</label>
              <DatePicker value={data} onChange={setData} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descrição *</label>
            <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Mensalidade Julho" />
          </div>

          <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select className="select" value={tipo} onChange={e => setTipo(e.target.value)}>
                {TIPOS_RECEITA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Método de pagamento</label>
              <select className="select" value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)}>
                {METODOS_RECEITA.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Estado</label>
            <select className="select" value={estado} onChange={e => setEstado(e.target.value as EstadoPagamento)}>
              <option value="PAGO">Pago</option>
              <option value="AGUARDA">Aguarda pagamento</option>
              <option value="ATRASO">Em atraso</option>
            </select>
          </div>

          <Toggle checked={recorrente} onChange={setRecorrente} label="Receita recorrente (conta para o MRR)" />

          <div>
            <label style={labelStyle}>Notas</label>
            <textarea className="input" rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button onClick={guardar} disabled={!valido || salvando} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)', opacity: (!valido || salvando) ? 0.6 : 1 }}>
            {salvando ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Nova Despesa ────────────────────────────────────────────────────
function ModalNovaDespesa({ onClose, onCreated }: { onClose: () => void; onCreated: (d: Despesa) => void }) {
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS_DESPESA[0].id)
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [metodoPagamento, setMetodoPagamento] = useState(METODOS_DESPESA[0])
  const [estado, setEstado] = useState<EstadoPagamento>('PAGO')
  const [recorrente, setRecorrente] = useState(false)
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  const valido = !!descricao.trim() && !!categoria && Number(valor) > 0 && !!data

  async function guardar() {
    if (!valido) return
    setSalvando(true)
    try {
      const dados: Omit<Despesa, 'id' | 'createdAt'> = {
        descricao: descricao.trim(), categoria, valor: Number(valor), data, estado, recorrente,
        metodoPagamento, notas: notas.trim() || undefined,
      }
      const id = await financeiroService.createDespesa(dados)
      onCreated({ id, ...dados })
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 'min(440px, 94vw)', maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Nova despesa</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Descrição *</label>
            <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Subscrição Figma" />
          </div>

          <div>
            <label style={labelStyle}>Categoria *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 8 }}>
              {CATEGORIAS_DESPESA.map(cat => {
                const Icon = cat.icon
                const ativo = categoria === cat.id
                return (
                  <button key={cat.id} type="button" onClick={() => setCategoria(cat.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 8, border: ativo ? '1px solid var(--accent-red)' : '1px solid var(--border-subtle)', backgroundColor: ativo ? 'var(--pill-red-bg)' : 'var(--bg-input)', color: ativo ? 'var(--accent-red)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>
                    <Icon size={16} />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Valor (€) *</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Data *</label>
              <DatePicker value={data} onChange={setData} />
            </div>
          </div>

          <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Método de pagamento</label>
              <select className="select" value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)}>
                {METODOS_DESPESA.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select className="select" value={estado} onChange={e => setEstado(e.target.value as EstadoPagamento)}>
                <option value="PAGO">Pago</option>
                <option value="AGUARDA">Pendente</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          <Toggle checked={recorrente} onChange={setRecorrente} label="Despesa recorrente" />

          <div>
            <label style={labelStyle}>Notas</label>
            <textarea className="input" rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button onClick={guardar} disabled={!valido || salvando} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-red)', borderColor: 'var(--accent-red)', opacity: (!valido || salvando) ? 0.6 : 1 }}>
            {salvando ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
