'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ExternalLink, Kanban, Plus, Edit, Trash2, Star, CheckSquare, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import {
  clientesService, projetosService, tarefasService, categoriasService, kpiValoresService,
  KPI_CATEGORIA_INFO, formatarKPIValor, variacaoKPI,
  type Cliente, type Projeto, type Tarefa, type Categoria, type TarefaStatus, type KPIValor, type KPICategoria,
} from '@/lib/db'
import TarefasBoard from '@/components/tarefas/TarefasBoard'
import { PageHeader } from '@/components/ui/PageHeader'

function gerarIdLink() {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nomeMesCurto(mes: number, ano: number) {
  const s = new Date(ano, mes - 1).toLocaleDateString('pt-PT', { month: 'short' })
  return s.replace('.', '').replace(/^\w/, c => c.toUpperCase())
}

const PLANO_COLOR: Record<string, string> = { ONE: 'pill-green', PRESENCE: 'pill-purple', GROWTH: 'pill-blue' }
const STATUS_COLOR: Record<string, string> = {
  ATIVO: 'var(--accent-green)', ONBOARDING: 'var(--accent-amber)',
  PAUSADO: 'var(--text-muted)', CANCELADO: 'var(--accent-red)'
}

export default function ClientePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [novoLink, setNovoLink] = useState({ label: '', url: '' })
  const [historico, setHistorico] = useState<{ mes: number; ano: number; valores: KPIValor[] }[]>([])
  const [tabMetrica, setTabMetrica] = useState<KPICategoria | null>(null)

  useEffect(() => {
    async function load() {
      const [c, p, t, cats] = await Promise.all([
        clientesService.getById(id),
        projetosService.getByCliente(id),
        tarefasService.getByClientes([id]),
        categoriasService.getAll(),
      ])
      setCliente(c)
      setProjetos(p)
      setTarefas(t)
      setCategoriasConfig(cats)
      setHistorico(await kpiValoresService.getUltimos3Meses(id, p))
      setLoading(false)
    }
    load()
  }, [id])

  const categoriasComDados = useMemo(() => {
    const idsComDados = new Set(historico.flatMap(h => h.valores.map(v => v.kpiId)))
    const ordem = Object.keys(KPI_CATEGORIA_INFO) as KPICategoria[]
    const presentes = new Set((cliente?.kpis || []).filter(k => idsComDados.has(k.kpiId)).map(k => k.categoria))
    return ordem.filter(c => presentes.has(c))
  }, [cliente, historico])

  useEffect(() => {
    if (categoriasComDados.length && (!tabMetrica || !categoriasComDados.includes(tabMetrica))) {
      setTabMetrica(categoriasComDados[0])
    }
  }, [categoriasComDados, tabMetrica])

  async function recalcularProgressoDoProjeto(tarefasAtualizadas: Tarefa[], projetoId: string) {
    const doProjeto = tarefasAtualizadas.filter(t => t.projetoId === projetoId)
    if (!doProjeto.length) return
    const conc = doProjeto.filter(t => t.status === 'CONCLUIDA').length
    const progresso = Math.round((conc / doProjeto.length) * 100)
    await projetosService.update(projetoId, { progresso })
    setProjetos(prev => prev.map(p => p.id === projetoId ? { ...p, progresso } : p))
  }

  async function setStatusTarefa(tarefaId: string, novoStatus: TarefaStatus) {
    const atualizadas = tarefas.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t)
    setTarefas(atualizadas)
    await tarefasService.updateStatus(tarefaId, novoStatus)
    const tarefa = tarefas.find(t => t.id === tarefaId)
    if (tarefa) await recalcularProgressoDoProjeto(atualizadas, tarefa.projetoId)
  }

  async function toggleTarefa(tarefaId: string, statusAtual: TarefaStatus) {
    await setStatusTarefa(tarefaId, statusAtual === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA')
  }

  async function updateDataLimiteTarefa(tarefaId: string, data: string) {
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, dataLimite: data } : t))
    await tarefasService.update(tarefaId, { dataLimite: data || undefined })
  }

  async function setCategoriaTarefa(tarefaId: string, categoria: string) {
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, categoria } : t))
    await tarefasService.update(tarefaId, { categoria })
  }

  function projetoAlvo(): Projeto | null {
    if (!projetos.length) return null
    const ativos = projetos.filter(p => p.status !== 'CONCLUIDO')
    const lista = ativos.length ? ativos : projetos
    return [...lista].sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes))[0]
  }

  async function criarTarefaInline(dados: { titulo: string; status: TarefaStatus; categoria: string; dataLimite?: string }) {
    const alvo = projetoAlvo()
    if (!alvo) return
    const doProjeto = tarefas.filter(t => t.projetoId === alvo.id)
    const ordem = doProjeto.length ? Math.max(...doProjeto.map(t => t.ordem)) + 1 : 1
    const dadosTarefa = {
      projetoId: alvo.id!, clienteId: id, titulo: dados.titulo,
      categoria: dados.categoria || 'Outros', status: dados.status, ordem,
      dataLimite: dados.dataLimite || undefined,
    }
    const novoId = await tarefasService.create(dadosTarefa)
    const atualizadas = [...tarefas, { id: novoId, ...dadosTarefa }]
    setTarefas(atualizadas)
    await recalcularProgressoDoProjeto(atualizadas, alvo.id!)
  }

  async function adicionarLink() {
    if (!novoLink.label.trim() || !novoLink.url.trim() || !cliente) return
    const url = /^https?:\/\//i.test(novoLink.url) ? novoLink.url : `https://${novoLink.url}`
    const linksFavoritos = [...(cliente.linksFavoritos || []), { id: gerarIdLink(), label: novoLink.label, url }]
    await clientesService.update(id, { linksFavoritos })
    setCliente(c => c ? { ...c, linksFavoritos } : c)
    setNovoLink({ label: '', url: '' })
    setShowLinkForm(false)
  }

  async function removerLink(linkId: string) {
    if (!cliente) return
    const linksFavoritos = (cliente.linksFavoritos || []).filter(l => l.id !== linkId)
    await clientesService.update(id, { linksFavoritos })
    setCliente(c => c ? { ...c, linksFavoritos } : c)
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!cliente) return <div className="flex h-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>Cliente não encontrado</div>

  const projetosAtivos = projetos.filter(p => p.status !== 'CONCLUIDO')
  const links = [
    { key: 'driveUrl', label: 'Drive', icon: '📁' },
    { key: 'canvaUrl', label: 'Canva', icon: '🎨' },
    { key: 'dominioUrl', label: 'Site', icon: '🌐' },
    { key: 'whatsappUrl', label: 'WhatsApp', icon: '💬' },
  ].filter(l => (cliente as unknown as Record<string, unknown>)[l.key])

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Topbar */}
      <PageHeader
        title={<>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>
            {cliente.empresa.slice(0,2).toUpperCase()}
          </div>
          {cliente.empresa}
        </>}
        subtitle={cliente.contacto}
        onBack={() => router.back()}
        actions={<>
          <Link href={`/clientes/${id}/editar`} className="btn btn-ghost"><Edit size={13} /> Editar</Link>
          <Link href={`/projetos/novo?cliente=${id}`} className="btn btn-primary"><Plus size={13} /> Novo projeto</Link>
        </>}
      />

      <div className="flex-1 overflow-auto p-5">
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-blue)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Plano</div>
              <span className={`pill ${PLANO_COLOR[cliente.plano]}`}>{cliente.plano}</span>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-green)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>MRR</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-green)' }}>{cliente.mrr}€</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-amber)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Projetos ativos</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-amber)' }}>{projetosAtivos.length}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-purple)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Estado</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: STATUS_COLOR[cliente.status] }}>● {cliente.status}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Serviços */}
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Serviços activos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(cliente.servicos || []).filter(s => s.ativo).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.nome}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{s.quantidade} {s.unidade} / {s.frequencia.toLowerCase()}</span>
                  </div>
                ))}
                {!(cliente.servicos || []).filter(s => s.ativo).length && (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '12px 0' }}>Sem serviços configurados</div>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="sec-title" style={{ marginBottom: 0 }}>Links rápidos</div>
                <button onClick={() => setShowLinkForm(s => !s)} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 7px' }}>
                  <Plus size={10} /> Link
                </button>
              </div>
              {showLinkForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, padding: 8, backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <input className="input" value={novoLink.label} onChange={e => setNovoLink(f => ({ ...f, label: e.target.value }))} placeholder="Nome (ex: Painel de anúncios)" style={{ fontSize: 12 }} />
                  <input className="input" value={novoLink.url} onChange={e => setNovoLink(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={{ fontSize: 12 }} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowLinkForm(false)} className="btn btn-ghost" style={{ fontSize: 11 }}>Cancelar</button>
                    <button onClick={adicionarLink} disabled={!novoLink.label.trim() || !novoLink.url.trim()} className="btn btn-primary" style={{ fontSize: 11 }}>Guardar</button>
                  </div>
                </div>
              )}
              {links.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {links.map(l => (
                    <a key={l.key} href={(cliente as unknown as Record<string, unknown>)[l.key] as string} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none', transition: 'border-color 0.15s', cursor: 'pointer' }}>
                      <span style={{ fontSize: 14 }}>{l.icon}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{l.label}</span>
                      <ExternalLink size={11} style={{ color: 'var(--text-faint)' }} />
                    </a>
                  ))}
                </div>
              )}
              {links.length === 0 && !cliente.instagram && !(cliente.linksFavoritos || []).length && (
                <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '12px 0' }}>Sem links adicionados</div>
              )}
              {cliente.instagram && (
                <a href={`https://instagram.com/${cliente.instagram.replace('@','')}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none', marginTop: 6, cursor: 'pointer' }}>
                  <span style={{ fontSize: 14 }}>📸</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{cliente.instagram}</span>
                  <ExternalLink size={11} style={{ color: 'var(--text-faint)' }} />
                </a>
              )}
              {(cliente.linksFavoritos || []).map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', marginTop: 6 }}>
                  <Star size={12} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, textDecoration: 'none' }}>{l.label}</a>
                  <button onClick={() => removerLink(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0, display: 'flex' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Projetos */}
          <div className="card" style={{ padding: 16 }}>
            <div className="sec-title"><Kanban size={12} /> Projetos</div>
            {projetos.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projetos.map(p => (
                  <Link key={p.id} href={`/projetos/${p.id}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', backgroundColor: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{p.nome}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.status}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.progresso}%`, backgroundColor: 'var(--brand)', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{p.progresso}%</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>Sem projetos ainda</div>
                <Link href={`/projetos/novo?cliente=${id}`} className="btn btn-primary" style={{ fontSize: 11 }}>
                  <Plus size={12} /> Criar projeto do mês
                </Link>
              </div>
            )}
          </div>

          {/* Tarefas — agrega todos os projectos deste cliente */}
          {(tarefas.length > 0 || projetos.length > 0) && (
            <div className="card" style={{ padding: 16, minWidth: 0 }}>
              <div className="sec-title"><CheckSquare size={12} /> Tarefas</div>
              <TarefasBoard
                tarefas={tarefas}
                categoriasConfig={categoriasConfig}
                onToggle={toggleTarefa}
                onSetStatus={setStatusTarefa}
                onSetCategoria={setCategoriaTarefa}
                onUpdateDataLimite={updateDataLimiteTarefa}
                onCriar={criarTarefaInline}
              />
            </div>
          )}

          {/* Notas */}
          {cliente.notas && (
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Notas</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cliente.notas}</div>
            </div>
          )}

          {/* Evolução de métricas */}
          {categoriasComDados.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="sec-title" style={{ marginBottom: 0 }}><TrendingUp size={12} /> Evolução de métricas</div>
                {projetoAlvo() && (
                  <Link href={`/projetos/${projetoAlvo()!.id}?tab=metricas`} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
                    Registar métricas
                  </Link>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {categoriasComDados.map(cat => (
                  <button key={cat} onClick={() => setTabMetrica(cat)}
                    style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: tabMetrica === cat ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: tabMetrica === cat ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: tabMetrica === cat ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                    {KPI_CATEGORIA_INFO[cat].icon} {KPI_CATEGORIA_INFO[cat].label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(cliente.kpis || [])
                  .filter(k => tabMetrica && k.categoria === tabMetrica && historico.some(h => h.valores.some(v => v.kpiId === k.kpiId)))
                  .sort((a, b) => (a.isPrincipal === b.isPrincipal ? a.ordem - b.ordem : a.isPrincipal ? -1 : 1))
                  .map(k => (
                    <div key={k.kpiId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 140 }}>
                        {k.isPrincipal && <Star size={11} style={{ color: 'var(--accent-amber)' }} fill="var(--accent-amber)" />}
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.nome}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        {historico.map((h, i) => {
                          const valor = h.valores.find(v => v.kpiId === k.kpiId)?.valor
                          const anterior = i > 0 ? h.valores.find(v => v.kpiId === k.kpiId) && historico[i - 1].valores.find(v => v.kpiId === k.kpiId)?.valor : undefined
                          const variacao = i > 0 && valor !== undefined ? variacaoKPI(valor, anterior) : null
                          return (
                            <span key={i}>
                              {nomeMesCurto(h.mes, h.ano)}: <strong style={{ color: 'var(--text-secondary)' }}>{valor !== undefined ? formatarKPIValor(valor, k.unidade) : '—'}</strong>
                              {variacao !== null && (
                                <span style={{ color: variacao > 0 ? 'var(--accent-green)' : variacao < 0 ? 'var(--accent-red)' : 'var(--text-faint)' }}> ({variacao > 0 ? '+' : ''}{variacao}%)</span>
                              )}
                              {i < historico.length - 1 && <span style={{ color: 'var(--text-faint)', marginLeft: 10 }}>|</span>}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
