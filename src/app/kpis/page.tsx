'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, LineChart, ArrowRight } from 'lucide-react'
import {
  clientesService, projetosService, kpiValoresService, formatarKPIValor, variacaoKPI,
  type Cliente, type Projeto, type KPIValor,
} from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

function projetoDoMes(projetos: Projeto[], clienteId: string, mes: number, ano: number) {
  return projetos.find(p => p.clienteId === clienteId && p.mes === mes && p.ano === ano) || null
}

function projetoMaisRecente(projetos: Projeto[], clienteId: string): Projeto | null {
  const doCliente = projetos.filter(p => p.clienteId === clienteId)
  if (!doCliente.length) return null
  const ativos = doCliente.filter(p => p.status !== 'CONCLUIDO')
  const lista = ativos.length ? ativos : doCliente
  return [...lista].sort((a, b) => (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes))[0]
}

function mesAnterior(mes: number, ano: number) {
  return mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano }
}

export default function KPIsPage() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [kpiValores, setKpiValores] = useState<KPIValor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [c, p, v] = await Promise.all([
          clientesService.getAll(), projetosService.getAll(), kpiValoresService.getAll(),
        ])
        setClientes(c.filter(x => x.status === 'ATIVO'))
        setProjetos(p)
        setKpiValores(v)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const cards = useMemo(() => {
    const { mes: mesAnt, ano: anoAnt } = mesAnterior(mes, ano)
    return clientes.map(cliente => {
      const projAtual = projetoDoMes(projetos, cliente.id!, mes, ano)
      const projAnt = projetoDoMes(projetos, cliente.id!, mesAnt, anoAnt)
      const valoresAtuais = projAtual ? kpiValores.filter(v => v.projetoId === projAtual.id) : []
      const valoresAnteriores = projAnt ? kpiValores.filter(v => v.projetoId === projAnt.id) : []
      const kpisAtivos = (cliente.kpis || []).filter(k => k.ativo).sort((a, b) => a.ordem - b.ordem)
      const principalDef = kpisAtivos.find(k => k.isPrincipal) || kpisAtivos[0] || null
      const principalValor = principalDef ? valoresAtuais.find(v => v.kpiId === principalDef.kpiId) : undefined
      const principalAnterior = principalDef ? valoresAnteriores.find(v => v.kpiId === principalDef.kpiId)?.valor : undefined
      const secundarios = kpisAtivos
        .filter(k => k.kpiId !== principalDef?.kpiId)
        .map(k => valoresAtuais.find(v => v.kpiId === k.kpiId))
        .filter((v): v is KPIValor => !!v)
        .slice(0, 3)
      const alvo = projetoMaisRecente(projetos, cliente.id!)
      return { cliente, principalDef, principalValor, principalAnterior, secundarios, alvo, temDados: valoresAtuais.length > 0 }
    })
  }, [clientes, projetos, kpiValores, mes, ano])

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Dashboard de KPIs" icon={LineChart} actions={
        <input type="month" className="input" style={{ width: 150 }}
          value={`${ano}-${String(mes).padStart(2, '0')}`}
          onChange={e => { const [y, m] = e.target.value.split('-').map(Number); setAno(y); setMes(m) }} />
      } />

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {!cards.length ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 13 }}>Sem clientes activos</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {cards.map(({ cliente, principalDef, principalValor, principalAnterior, secundarios, alvo, temDados }) => (
              <div key={cliente.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{cliente.empresa}</div>
                  <span className="pill pill-blue">{cliente.plano}</span>
                </div>

                {!temDados || !principalDef ? (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '10px 0' }}>Sem métricas registadas</div>
                ) : (
                  <>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>
                        {principalValor ? formatarKPIValor(principalValor.valor, principalValor.kpiUnidade) : '—'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{principalDef.nome}</span>
                        {(() => {
                          const v = principalValor ? variacaoKPI(principalValor.valor, principalAnterior) : null
                          if (v === null) return <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>—</span>
                          return <span style={{ fontSize: 11, fontWeight: 500, color: v > 0 ? 'var(--accent-green)' : v < 0 ? 'var(--accent-red)' : 'var(--text-faint)' }}>
                            {v > 0 ? '↑' : v < 0 ? '↓' : '—'} {Math.abs(v)}%
                          </span>
                        })()}
                      </div>
                    </div>

                    {secundarios.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                        {secundarios.map(v => (
                          <div key={v.kpiId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{v.kpiNome}</span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{formatarKPIValor(v.valor, v.kpiUnidade)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {alvo && (
                  <Link href={`/projetos/${alvo.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent-blue)', textDecoration: 'none', marginTop: 'auto', paddingTop: 4 }}>
                    Ver métricas completas <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
