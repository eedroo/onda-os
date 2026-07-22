'use client'

import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Info } from 'lucide-react'
import { clientesService, projetosService, getTarefasPorPlano, type Cliente } from '@/lib/db'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

export default function NovoProjetoPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
      </div>
    }>
      <NovoProjetoForm />
    </Suspense>
  )
}

function NovoProjetoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdPreset = searchParams.get('cliente')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projetosExistentes, setProjetosExistentes] = useState<{ clienteId: string; mes: number; ano: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState('')

  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())

  useEffect(() => {
    async function load() {
      try {
        const [c, p] = await Promise.all([clientesService.getAll(), projetosService.getAll()])
        setClientes(c)
        setProjetosExistentes(p.map(x => ({ clienteId: x.clienteId, mes: x.mes, ano: x.ano })))
        if (clienteIdPreset && c.some(x => x.id === clienteIdPreset)) setClienteId(clienteIdPreset)
        else if (c.length) setClienteId(c[0].id!)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [clienteIdPreset])

  const cliente = clientes.find(c => c.id === clienteId) || null

  const tarefasPreview = useMemo(() => {
    if (!cliente) return []
    if (cliente.tarefasPersonalizadas && cliente.tarefasPersonalizadas.length > 0) {
      return cliente.tarefasPersonalizadas
        .slice().sort((a, b) => a.ordem - b.ordem)
        .map(t => ({ titulo: t.titulo, categoria: t.categoriaNome }))
    }
    return getTarefasPorPlano(cliente.plano).map(t => ({ titulo: t.titulo, categoria: t.categoria }))
  }, [cliente])

  const jaExiste = cliente ? projetosExistentes.some(p => p.clienteId === cliente.id && p.mes === mes && p.ano === ano) : false

  async function criar() {
    if (!cliente) return
    setErro(null)
    if (jaExiste) { setErro('Este cliente já tem um projecto para este mês/ano.'); return }
    setCriando(true)
    try {
      const id = await projetosService.criarMensal(cliente, mes, ano)
      router.push(`/projetos/${id}`)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar o projecto. Tenta novamente.')
      setCriando(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <button onClick={() => router.back()} className="btn btn-ghost py-1 px-2"><ArrowLeft size={14} /></button>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Novo projeto</div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {clientes.length === 0 ? (
            <div className="card p-5" style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
              Sem clientes ainda — cria um cliente primeiro.
            </div>
          ) : (
            <>
              <div className="card p-5">
                <div className="sec-title">Cliente e período</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Cliente</label>
                    <select className="select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Mês</label>
                    <select className="select" value={mes} onChange={e => setMes(Number(e.target.value))}>
                      {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Ano</label>
                    <input className="input" type="number" value={ano} onChange={e => setAno(Number(e.target.value))} />
                  </div>
                </div>
                {jaExiste && (
                  <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, backgroundColor: 'var(--pill-amber-bg)', color: 'var(--accent-amber)', fontSize: 11, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                    Este cliente já tem um projecto para {MESES[mes - 1]} de {ano}.
                  </div>
                )}
              </div>

              <div className="card p-5">
                <div className="sec-title">Tarefas que serão geradas ({tarefasPreview.length})</div>
                {tarefasPreview.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Sem tarefas definidas para este cliente.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflow: 'auto' }}>
                    {tarefasPreview.map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', backgroundColor: 'var(--bg-input)', borderRadius: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span>{t.titulo}</span>
                        <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>{t.categoria}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 8 }}>
                  {cliente?.tarefasPersonalizadas && cliente.tarefasPersonalizadas.length > 0
                    ? 'Baseado no perfil de tarefas deste cliente.'
                    : 'Baseado no template genérico do plano deste cliente.'}
                </div>
              </div>

              {erro && <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--pill-red-bg)', color: 'var(--accent-red)', fontSize: 12 }}>{erro}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => router.back()} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                <button type="button" disabled={criando || jaExiste} onClick={criar} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {criando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Criar projeto
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
