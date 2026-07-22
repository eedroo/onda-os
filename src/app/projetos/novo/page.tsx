'use client'

import { Suspense, useEffect, useState, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2, Info, RotateCcw } from 'lucide-react'
import {
  clientesService, projetosService, categoriasService, getTarefasPorPlano,
  type Cliente, type Categoria, type Frequencia,
} from '@/lib/db'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const FREQUENCIAS: Frequencia[] = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

interface TarefaEditavel { id: string; titulo: string; categoria: string; frequencia: Frequencia }

function gerarId() {
  return `nova-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sugestoesPara(cliente: Cliente): TarefaEditavel[] {
  if (cliente.tarefasPersonalizadas && cliente.tarefasPersonalizadas.length > 0) {
    return cliente.tarefasPersonalizadas
      .slice().sort((a, b) => a.ordem - b.ordem)
      .map(t => ({ id: gerarId(), titulo: t.titulo, categoria: t.categoriaNome, frequencia: t.frequencia }))
  }
  return getTarefasPorPlano(cliente.plano).map(t => ({ id: gerarId(), titulo: t.titulo, categoria: t.categoria, frequencia: 'MENSAL' as Frequencia }))
}

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
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])
  const [projetosExistentes, setProjetosExistentes] = useState<{ clienteId: string; mes: number; ano: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState('')
  const [tarefas, setTarefas] = useState<TarefaEditavel[]>([])

  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())

  useEffect(() => {
    async function load() {
      try {
        const [c, p, cats] = await Promise.all([clientesService.getAll(), projetosService.getAll(), categoriasService.getAll()])
        setClientes(c)
        setCategoriasConfig(cats)
        setProjetosExistentes(p.map(x => ({ clienteId: x.clienteId, mes: x.mes, ano: x.ano })))
        const inicial = (clienteIdPreset && c.some(x => x.id === clienteIdPreset)) ? clienteIdPreset : (c[0]?.id || '')
        setClienteId(inicial)
        const clienteInicial = c.find(x => x.id === inicial)
        if (clienteInicial) setTarefas(sugestoesPara(clienteInicial))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [clienteIdPreset])

  const cliente = clientes.find(c => c.id === clienteId) || null

  function onClienteChange(novoId: string) {
    setClienteId(novoId)
    const c = clientes.find(x => x.id === novoId)
    if (c) setTarefas(sugestoesPara(c))
  }

  function reporSugestoes() {
    if (cliente) setTarefas(sugestoesPara(cliente))
  }

  function updateTarefa(id: string, patch: Partial<TarefaEditavel>) {
    setTarefas(t => t.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  function removerTarefa(id: string) {
    setTarefas(t => t.filter(x => x.id !== id))
  }

  function adicionarTarefa() {
    setTarefas(t => [...t, { id: gerarId(), titulo: '', categoria: categoriasConfig[0]?.nome || '', frequencia: 'MENSAL' }])
  }

  const jaExiste = cliente ? projetosExistentes.some(p => p.clienteId === cliente.id && p.mes === mes && p.ano === ano) : false

  async function criar() {
    if (!cliente) return
    setErro(null)
    if (jaExiste) { setErro('Este cliente já tem um projecto para este mês/ano.'); return }
    setCriando(true)
    try {
      const override = tarefas.filter(t => t.titulo.trim()).map(t => ({ titulo: t.titulo, categoria: t.categoria || 'Outros', frequencia: t.frequencia }))
      const id = await projetosService.criarMensal(cliente, mes, ano, override)
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
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                    <select className="select" value={clienteId} onChange={e => onClienteChange(e.target.value)}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div className="sec-title" style={{ marginBottom: 0 }}>Tarefas que serão geradas ({tarefas.length})</div>
                  <button type="button" onClick={reporSugestoes} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
                    <RotateCcw size={11} /> Repor sugestões
                  </button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 12 }}>
                  {cliente?.tarefasPersonalizadas && cliente.tarefasPersonalizadas.length > 0
                    ? 'Sugestão baseada no perfil de tarefas deste cliente — remove, edita ou adiciona à vontade antes de criar.'
                    : 'Sugestão baseada no template genérico do plano deste cliente — remove, edita ou adiciona à vontade antes de criar.'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {tarefas.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                      <input
                        style={{ flex: 2, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-secondary)' }}
                        value={t.titulo} onChange={e => updateTarefa(t.id, { titulo: e.target.value })}
                        placeholder="Título da tarefa"
                      />
                      <select
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer' }}
                        value={t.categoria} onChange={e => updateTarefa(t.id, { categoria: e.target.value })}
                      >
                        <option value="">Outros</option>
                        {categoriasConfig.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                      </select>
                      <select
                        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer' }}
                        value={t.frequencia} onChange={e => updateTarefa(t.id, { frequencia: e.target.value as Frequencia })}
                      >
                        {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <button type="button" onClick={() => removerTarefa(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {tarefas.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '14px 0' }}>Sem tarefas — adiciona uma manualmente.</div>
                  )}
                </div>

                <button type="button" onClick={adicionarTarefa} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
                  <Plus size={11} /> Adicionar tarefa
                </button>
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
