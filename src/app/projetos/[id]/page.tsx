'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Plus, ExternalLink, FileDown, Pencil } from 'lucide-react'
import {
  projetosService, tarefasService, categoriasService, clientesService, kpiValoresService,
  KPI_CATEGORIA_INFO, variacaoKPI,
  type Projeto, type Tarefa, type TarefaStatus, type Categoria, type Frequencia, type Cliente,
  type KPIValor, type KPICategoria, type KPIUnidade,
} from '@/lib/db'
import TarefasBoard from '@/components/tarefas/TarefasBoard'
import { PageHeader } from '@/components/ui/PageHeader'
import { gerarRelatorioPDF } from '@/lib/gerarRelatorio'
import { DatePicker } from '@/components/ui/DatePicker'

const UNIDADE_SUFIXO: Record<KPIUnidade, string> = { numero: '', percentagem: '%', estrelas: '★', euros: '€' }

const FREQUENCIAS: Frequencia[] = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']
const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

const LINKS_FIXOS = [
  { key: 'driveUrl', label: 'Drive', icon: '📁' },
  { key: 'canvaUrl', label: 'Canva', icon: '🎨' },
  { key: 'dominioUrl', label: 'Site', icon: '🌐' },
  { key: 'whatsappUrl', label: 'WhatsApp', icon: '💬' },
]

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', categoria: '', frequencia: 'MENSAL' as Frequencia, dataLimite: '' })

  const [tab, setTab] = useState<'tarefas' | 'metricas'>(searchParams.get('tab') === 'metricas' ? 'metricas' : 'tarefas')
  const [kpiValores, setKpiValores] = useState<Record<string, number>>({})
  const [kpiValoresAnteriores, setKpiValoresAnteriores] = useState<KPIValor[]>([])
  const [showRelatorioModal, setShowRelatorioModal] = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [nomeEditado, setNomeEditado] = useState('')
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [proximosPassos, setProximosPassos] = useState('')
  const [incluirTarefas, setIncluirTarefas] = useState(true)
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const [allProjetos, t, cats] = await Promise.all([
        projetosService.getAll(),
        tarefasService.getByProjeto(id),
        categoriasService.getAll(),
      ])
      const p = allProjetos.find(x => x.id === id) || null
      setProjeto(p)
      setTarefas(t)
      setCategoriasConfig(cats)
      if (p) {
        setCliente(await clientesService.getById(p.clienteId))
        const doCliente = allProjetos
          .filter(x => x.clienteId === p.clienteId && (x.ano * 12 + x.mes) < (p.ano * 12 + p.mes))
          .sort((a, b) => (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes))
        const anterior = doCliente[0] || null
        const [valoresAtuais, valoresAnteriores] = await Promise.all([
          kpiValoresService.getByProjeto(p.id!),
          anterior ? kpiValoresService.getByProjeto(anterior.id!) : Promise.resolve([]),
        ])
        setKpiValores(Object.fromEntries(valoresAtuais.map(v => [v.kpiId, v.valor])))
        setKpiValoresAnteriores(valoresAnteriores)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function onChangeKpiValor(kpiId: string, valorStr: string) {
    const valor = valorStr === '' ? 0 : Number(valorStr)
    setKpiValores(v => ({ ...v, [kpiId]: valor }))
    const kpiCliente = (cliente?.kpis || []).find(k => k.kpiId === kpiId)
    if (!kpiCliente || !projeto) return
    clearTimeout(debounceRefs.current[kpiId])
    debounceRefs.current[kpiId] = setTimeout(() => {
      kpiValoresService.upsert({
        projetoId: projeto.id!, clienteId: projeto.clienteId, mes: projeto.mes, ano: projeto.ano,
        kpiId, kpiNome: kpiCliente.nome, kpiUnidade: kpiCliente.unidade, kpiCategoria: kpiCliente.categoria,
        valor,
      })
    }, 800)
  }

  async function salvarNome() {
    const novoNome = nomeEditado.trim()
    setEditandoNome(false)
    if (!novoNome || !projeto || novoNome === projeto.nome) return
    setProjeto(prev => prev ? { ...prev, nome: novoNome } : prev)
    await projetosService.update(projeto.id!, { nome: novoNome })
  }

  async function handleGerarPDF() {
    if (!cliente || !projeto) return
    setGerandoPDF(true)
    try {
      const valoresAtuais: KPIValor[] = kpisAtivos.map(k => ({
        projetoId: projeto.id!, clienteId: projeto.clienteId, mes: projeto.mes, ano: projeto.ano,
        kpiId: k.kpiId, kpiNome: k.nome, kpiUnidade: k.unidade, kpiCategoria: k.categoria,
        valor: kpiValores[k.kpiId] ?? 0,
      }))
      const todosProjetos = await projetosService.getByCliente(projeto.clienteId)
      const kpiValores3Meses = await kpiValoresService.getUltimos3Meses(projeto.clienteId, todosProjetos)
      const tarefasConcluidas = tarefas.filter(t => t.status === 'CONCLUIDA')
      await gerarRelatorioPDF({
        cliente, projeto, kpiValores: valoresAtuais, kpiValoresAnteriores,
        kpiValores3Meses, tarefasConcluidas, proximosPassos, incluirTarefas,
      })
      setShowRelatorioModal(false)
    } catch (e) { console.error(e) }
    finally { setGerandoPDF(false) }
  }

  async function recalcularProgresso(tarefasAtualizadas: Tarefa[]) {
    const concluidas = tarefasAtualizadas.filter(t => t.status === 'CONCLUIDA').length
    const progresso = tarefasAtualizadas.length > 0
      ? Math.round((concluidas / tarefasAtualizadas.length) * 100) : 0
    await projetosService.update(id, { progresso })
    setProjeto(prev => prev ? { ...prev, progresso } : null)
  }

  async function setStatus(tarefaId: string, novoStatus: TarefaStatus) {
    const updated = tarefas.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t)
    setTarefas(updated)
    await tarefasService.updateStatus(tarefaId, novoStatus)
    await recalcularProgresso(updated)
  }

  async function toggleTarefa(tarefaId: string, statusAtual: TarefaStatus) {
    const novoStatus: TarefaStatus = statusAtual === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
    await setStatus(tarefaId, novoStatus)
  }

  async function updateDataLimite(tarefaId: string, data: string) {
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, dataLimite: data } : t))
    await tarefasService.update(tarefaId, { dataLimite: data || undefined })
  }

  async function setCategoria(tarefaId: string, categoria: string) {
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, categoria } : t))
    await tarefasService.update(tarefaId, { categoria })
  }

  async function adicionarTarefa() {
    if (!novaTarefa.titulo.trim() || !projeto) return
    setSalvando(true)
    try {
      const ordem = tarefas.length ? Math.max(...tarefas.map(t => t.ordem)) + 1 : 1
      const dados = {
        projetoId: id, clienteId: projeto.clienteId, titulo: novaTarefa.titulo,
        categoria: novaTarefa.categoria || 'Outros', status: 'PENDENTE' as TarefaStatus, ordem,
        frequencia: novaTarefa.frequencia, dataLimite: novaTarefa.dataLimite || undefined,
      }
      const novoId = await tarefasService.create(dados)
      const atualizadas = [...tarefas, { id: novoId, ...dados }]
      setTarefas(atualizadas)
      await recalcularProgresso(atualizadas)
      setNovaTarefa({ titulo: '', categoria: '', frequencia: 'MENSAL', dataLimite: '' })
      setShowForm(false)
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  async function criarTarefaInline(dados: { titulo: string; status: TarefaStatus; categoria: string; dataLimite?: string }) {
    if (!projeto) return
    const ordem = tarefas.length ? Math.max(...tarefas.map(t => t.ordem)) + 1 : 1
    const dadosTarefa = {
      projetoId: id, clienteId: projeto.clienteId, titulo: dados.titulo,
      categoria: dados.categoria || 'Outros', status: dados.status, ordem,
      dataLimite: dados.dataLimite || undefined,
    }
    const novoId = await tarefasService.create(dadosTarefa)
    const atualizadas = [...tarefas, { id: novoId, ...dadosTarefa }]
    setTarefas(atualizadas)
    await recalcularProgresso(atualizadas)
  }

  async function removerTarefa(tarefaId: string) {
    if (!confirm('Eliminar esta tarefa?')) return
    const atualizadas = tarefas.filter(t => t.id !== tarefaId)
    setTarefas(atualizadas)
    await tarefasService.delete(tarefaId)
    await recalcularProgresso(atualizadas)
  }

  async function reordenarTarefas(idsOrdenados: string[]) {
    setTarefas(prev => {
      const porId = Object.fromEntries(prev.map(t => [t.id, t]))
      const reordenadas = idsOrdenados.map((id, i) => ({ ...porId[id], ordem: i + 1 }))
      const outras = prev.filter(t => !idsOrdenados.includes(t.id!))
      return [...reordenadas, ...outras]
    })
    await tarefasService.reordenar(idsOrdenados)
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )
  if (!projeto) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Projeto não encontrado
    </div>
  )

  const concluidas = tarefas.filter(t => t.status === 'CONCLUIDA').length
  const kpisAtivos = (cliente?.kpis || []).filter(k => k.ativo).sort((a, b) => a.ordem - b.ordem)
  const nomeMes = new Date(projeto.ano, projeto.mes - 1).toLocaleString('pt-PT', { month: 'long' })
  const nomeProximoMes = new Date(projeto.ano, projeto.mes).toLocaleString('pt-PT', { month: 'long' })

  const links = cliente ? LINKS_FIXOS
    .filter(l => (cliente as unknown as Record<string, unknown>)[l.key])
    .map(l => ({ label: l.label, icon: l.icon, url: (cliente as unknown as Record<string, unknown>)[l.key] as string }))
    : []
  if (cliente?.instagram) links.push({ label: cliente.instagram, icon: '📸', url: `https://instagram.com/${cliente.instagram.replace('@', '')}` })
  const linksFavoritos = (cliente?.linksFavoritos || []).map(l => ({ label: l.label, icon: '⭐', url: l.url }))
  const todosLinks = [...links, ...linksFavoritos]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>

      <PageHeader title={editandoNome ? (
        <input autoFocus value={nomeEditado} onChange={e => setNomeEditado(e.target.value)}
          onBlur={salvarNome}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditandoNome(false) }}
          className="input" style={{ fontSize: 19, fontWeight: 600, padding: '2px 8px', width: 340 }} />
      ) : (
        <span onClick={() => { setNomeEditado(projeto.nome); setEditandoNome(true) }}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }} title="Clicar para renomear">
          {projeto.nome}
          <Pencil size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        </span>
      )} subtitle={`${concluidas} de ${tarefas.length} tarefas concluídas`} onBack={() => router.back()} actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: projeto.progresso >= 75 ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
              {projeto.progresso}%
            </div>
            <div style={{ width: 80, height: 5, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${projeto.progresso}%`, backgroundColor: projeto.progresso >= 75 ? 'var(--accent-green)' : 'var(--brand)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
          {tab === 'tarefas' && (
            <button onClick={() => setShowForm(s => !s)} className="btn btn-primary">
              <Plus size={13} /> Adicionar tarefa
            </button>
          )}
        </div>
      } />

      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        {(['tarefas', 'metricas'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: tab === t ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: tab === t ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t === 'tarefas' ? 'Tarefas' : 'Métricas'}
          </button>
        ))}
      </div>

      {/* Atalhos rápidos do cliente */}
      {todosLinks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0, overflowX: 'auto' }}>
          {todosLinks.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 6, textDecoration: 'none', fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <span>{l.icon}</span>{l.label}<ExternalLink size={9} style={{ color: 'var(--text-faint)' }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        {tab === 'tarefas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

          {showForm && (
            <div className="card" style={{ padding: 16, maxWidth: 960 }}>
              <div className="sec-title">Nova tarefa</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Título *</label>
                  <input className="input" value={novaTarefa.titulo} onChange={e => setNovaTarefa(f => ({ ...f, titulo: e.target.value }))} placeholder="Título da tarefa" />
                </div>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <select className="select" value={novaTarefa.categoria} onChange={e => setNovaTarefa(f => ({ ...f, categoria: e.target.value }))}>
                    <option value="">Outros</option>
                    {categoriasConfig.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Frequência</label>
                  <select className="select" value={novaTarefa.frequencia} onChange={e => setNovaTarefa(f => ({ ...f, frequencia: e.target.value as Frequencia }))}>
                    {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Data limite</label>
                  <DatePicker value={novaTarefa.dataLimite} onChange={v => setNovaTarefa(f => ({ ...f, dataLimite: v }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
                <button type="button" disabled={salvando || !novaTarefa.titulo.trim()} onClick={adicionarTarefa} className="btn btn-primary">
                  {salvando ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
                </button>
              </div>
            </div>
          )}

          <TarefasBoard
            tarefas={tarefas}
            categoriasConfig={categoriasConfig}
            onToggle={toggleTarefa}
            onSetStatus={setStatus}
            onSetCategoria={setCategoria}
            onUpdateDataLimite={updateDataLimite}
            onRemover={removerTarefa}
            onCriar={criarTarefaInline}
            onReordenar={reordenarTarefas}
            mesInicial={projeto.mes}
            anoInicial={projeto.ano}
          />

        </div>
        )}

        {tab === 'metricas' && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>Métricas de {nomeMes} {projeto.ano}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Regista aqui os dados reais recolhidos no início do mês seguinte</div>
              </div>
              <button onClick={() => setShowRelatorioModal(true)} className="btn btn-primary" style={{ flexShrink: 0 }}>
                <FileDown size={13} /> Gerar Relatório PDF
              </button>
            </div>

            {!kpisAtivos.length ? (
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Este cliente ainda não tem KPIs configurados</div>
                <Link href={`/clientes/${projeto.clienteId}/editar`} className="btn btn-ghost" style={{ fontSize: 11 }}>Configurar KPIs</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(Object.keys(KPI_CATEGORIA_INFO) as KPICategoria[]).map(cat => {
                  const doCategoria = kpisAtivos.filter(k => k.categoria === cat)
                  if (!doCategoria.length) return null
                  return (
                    <div key={cat} className="card" style={{ padding: 16 }}>
                      <div className="sec-title">{KPI_CATEGORIA_INFO[cat].icon} {KPI_CATEGORIA_INFO[cat].label}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {doCategoria.map(k => {
                          const anterior = kpiValoresAnteriores.find(v => v.kpiId === k.kpiId)?.valor
                          const atual = kpiValores[k.kpiId] ?? 0
                          const variacao = variacaoKPI(atual, anterior)
                          const corVariacao = variacao === null || variacao === 0 ? 'var(--text-faint)' : variacao > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                          const setaVariacao = variacao === null ? '—' : variacao > 0 ? '↑' : variacao < 0 ? '↓' : '—'
                          return (
                            <div key={k.kpiId} style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6,
                              backgroundColor: 'var(--bg-input)',
                              border: k.isPrincipal ? '1px solid var(--brand)' : '1px solid var(--border-subtle)',
                            }}>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.nome}</span>
                                {k.isPrincipal && <span className="pill pill-blue">Principal</span>}
                              </div>
                              <input type="number" className="input" style={{ width: 100, textAlign: 'right', flexShrink: 0 }}
                                value={kpiValores[k.kpiId] ?? ''} onChange={e => onChangeKpiValor(k.kpiId, e.target.value)} />
                              <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 16, flexShrink: 0 }}>{UNIDADE_SUFIXO[k.unidade]}</span>
                              <span style={{ fontSize: 11, minWidth: 46, textAlign: 'right', flexShrink: 0, color: corVariacao }}>
                                {variacao === null ? '—' : `${setaVariacao} ${Math.abs(variacao)}%`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showRelatorioModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => !gerandoPDF && setShowRelatorioModal(false)}>
          <div className="card" style={{ width: 420, padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 14 }}>Gerar Relatório PDF</div>
            <label style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>Próximos passos para {nomeProximoMes}</label>
            <textarea className="input" rows={4} value={proximosPassos} onChange={e => setProximosPassos(e.target.value)}
              placeholder="O que vem a seguir..." style={{ resize: 'none', marginBottom: 12 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={incluirTarefas} onChange={e => setIncluirTarefas(e.target.checked)} style={{ accentColor: 'var(--brand)', cursor: 'pointer' }} />
              Incluir tarefas concluídas
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowRelatorioModal(false)} disabled={gerandoPDF} className="btn btn-ghost">Cancelar</button>
              <button type="button" onClick={handleGerarPDF} disabled={gerandoPDF} className="btn btn-primary">
                {gerandoPDF ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
