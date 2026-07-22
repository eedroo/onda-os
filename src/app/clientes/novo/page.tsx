'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Info, Check, RotateCcw } from 'lucide-react'
import {
  clientesService, planosService, servicosService, categoriasService, tarefasDeServicos, asPlano,
  type ClienteStatus, type ServicoCliente, type PlanoConfig, type Servico, type Categoria,
  type TarefaPerfilCliente, type Frequencia,
} from '@/lib/db'

type FaseSite = 'SEM_SITE' | 'EM_DESENVOLVIMENTO' | 'ENTREGUE'

const FASES_SITE: { id: FaseSite; label: string; desc: string }[] = [
  { id: 'SEM_SITE',           label: 'Sem site ainda',      desc: 'Tarefas de criação activas' },
  { id: 'EM_DESENVOLVIMENTO', label: 'Em desenvolvimento',  desc: 'Site em construção' },
  { id: 'ENTREGUE',           label: 'Site entregue',       desc: 'Tarefas de manutenção activas' },
]

const FREQUENCIAS: Frequencia[] = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']

const PASSOS = [
  { n: 1, label: 'Dados básicos' },
  { n: 2, label: 'Plano & serviços' },
  { n: 3, label: 'Tarefas' },
  { n: 4, label: 'Links & configuração' },
]

const labelStyle = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block' as const, marginBottom: 6 }

function gerarIdTarefa() {
  return `perfil-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function NovoClientePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [planosConfig, setPlanosConfig] = useState<PlanoConfig[]>([])
  const [servicosConfig, setServicosConfig] = useState<Servico[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])

  // Passo 1
  const [dados, setDados] = useState({ empresa: '', contacto: '', email: '', telefone: '', instagram: '' })

  // Passo 2
  const [planoEscolhidoId, setPlanoEscolhidoId] = useState<string | null>(null)
  const [servicoIds, setServicoIds] = useState<string[]>([])

  // Passo 3
  const [tarefas, setTarefas] = useState<TarefaPerfilCliente[]>([])
  const [tarefasInicializadas, setTarefasInicializadas] = useState(false)

  // Passo 4
  const [config4, setConfig4] = useState({
    faseSite: 'SEM_SITE' as FaseSite, mrr: 0, status: 'ONBOARDING' as ClienteStatus,
    driveUrl: '', canvaUrl: '', dominioUrl: '', whatsappUrl: '', notas: '',
  })

  useEffect(() => {
    async function load() {
      try {
        const [p, s, c] = await Promise.all([planosService.getAll(), servicosService.getAll(), categoriasService.getAll()])
        setPlanosConfig(p); setServicosConfig(s); setCategoriasConfig(c)
      } catch (e) { console.error(e) }
      finally { setLoadingConfig(false) }
    }
    load()
  }, [])

  const servicosEscolhidos = servicosConfig.filter(s => servicoIds.includes(s.id!))
  const planoSelecionado = planosConfig.find(p => p.id === planoEscolhidoId)
  const planoFinal = asPlano(planoSelecionado?.nome || 'GROWTH')
  const temSite = planoFinal !== 'ONE'

  function escolherPlano(plano: PlanoConfig) {
    setPlanoEscolhidoId(plano.id!)
    setServicoIds(plano.servicoIds)
  }

  function toggleServico(id: string) {
    setServicoIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  function irParaTarefas() {
    if (!tarefasInicializadas) {
      setTarefas(tarefasDeServicos(servicosEscolhidos))
      setTarefasInicializadas(true)
    }
    setStep(3)
  }

  function reporSugestoes() {
    setTarefas(tarefasDeServicos(servicosEscolhidos))
  }

  function updateTarefa(id: string, patch: Partial<TarefaPerfilCliente>) {
    setTarefas(t => t.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  function removerTarefa(id: string) {
    setTarefas(t => t.filter(x => x.id !== id))
  }

  function adicionarTarefaCustom() {
    const cat = categoriasConfig[0]
    setTarefas(t => [...t, {
      id: gerarIdTarefa(), titulo: '', servicoId: '', servicoNome: 'Personalizado',
      categoriaId: cat?.id || '', categoriaNome: cat?.nome || '', frequencia: 'MENSAL', ordem: t.length + 1,
    }])
  }

  function podeAvancar() {
    if (step === 1) return dados.empresa.trim().length > 0
    if (step === 2) return servicoIds.length > 0
    return true
  }

  async function criarCliente() {
    setErro(null)
    setLoading(true)
    try {
      const servicosClienteLegacy: ServicoCliente[] = servicosEscolhidos.map(s => ({
        id: s.id!, nome: s.nome, ativo: true, frequencia: 'MENSAL', quantidade: 1, unidade: 'serviço',
      }))
      await clientesService.create({
        empresa: dados.empresa, contacto: dados.contacto || undefined, email: dados.email || undefined,
        telefone: dados.telefone || undefined, instagram: dados.instagram || undefined,
        plano: planoFinal, mrr: config4.mrr, status: config4.status,
        faseSite: temSite ? config4.faseSite : undefined,
        driveUrl: config4.driveUrl || undefined, canvaUrl: config4.canvaUrl || undefined,
        dominioUrl: config4.dominioUrl || undefined, whatsappUrl: config4.whatsappUrl || undefined,
        notas: config4.notas || undefined,
        servicos: servicosClienteLegacy,
        tarefasPersonalizadas: tarefas,
      })
      router.push('/clientes')
    } catch (err) {
      console.error(err)
      setErro('Não foi possível criar o cliente. Tenta novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <button onClick={() => router.back()} className="btn btn-ghost py-1 px-2"><ArrowLeft size={14} /></button>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Novo cliente</div>
      </div>

      {/* Indicador de passos */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        {PASSOS.map(p => (
          <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: step === p.n ? 'var(--accent-blue)' : step > p.n ? 'var(--accent-green)' : 'var(--text-faint)' }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600,
              border: `1px solid ${step === p.n ? 'var(--accent-blue)' : step > p.n ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
              backgroundColor: step === p.n ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'transparent',
            }}>
              {step > p.n ? <Check size={10} /> : p.n}
            </div>
            <span style={{ display: 'none' }} className="sm:inline">{p.label}</span>
            {p.label}
          </div>
        ))}
      </div>

      {loadingConfig ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-5">
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {step === 1 && (
              <div className="card p-5">
                <div className="sec-title">Dados básicos</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Empresa *</label>
                    <input className="input" value={dados.empresa} onChange={e => setDados(d => ({ ...d, empresa: e.target.value }))} required placeholder="Nome da empresa" />
                  </div>
                  <div>
                    <label style={labelStyle}>Contacto</label>
                    <input className="input" value={dados.contacto} onChange={e => setDados(d => ({ ...d, contacto: e.target.value }))} placeholder="Nome do contacto" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input className="input" type="email" value={dados.email} onChange={e => setDados(d => ({ ...d, email: e.target.value }))} placeholder="email@empresa.pt" />
                  </div>
                  <div>
                    <label style={labelStyle}>Telefone</label>
                    <input className="input" value={dados.telefone} onChange={e => setDados(d => ({ ...d, telefone: e.target.value }))} placeholder="+351 9xx xxx xxx" />
                  </div>
                  <div>
                    <label style={labelStyle}>Instagram</label>
                    <input className="input" value={dados.instagram} onChange={e => setDados(d => ({ ...d, instagram: e.target.value }))} placeholder="@handle" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="card p-5">
                <div className="sec-title">Plano</div>
                {planosConfig.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '8px 0 16px' }}>Sem planos configurados — cria planos em Configurações.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                    {planosConfig.map(p => (
                      <button
                        key={p.id} type="button"
                        onClick={() => escolherPlano(p)}
                        style={{
                          padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                          border: planoEscolhidoId === p.id ? '2px solid var(--brand)' : '1px solid var(--border-subtle)',
                          backgroundColor: planoEscolhidoId === p.id ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--bg-input)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>🌊 {p.nome}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.descricao || `${p.servicoNomes.length} serviço(s)`}</div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="sec-title">
                  Serviços incluídos
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    — o plano sugere estes, mas podes adicionar ou remover à vontade
                  </span>
                </div>
                {servicosConfig.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '8px 0' }}>Sem serviços configurados — cria serviços em Configurações.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {servicosConfig.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={servicoIds.includes(s.id!)} onChange={() => toggleServico(s.id!)}
                          style={{ width: 14, height: 14, accentColor: 'var(--brand)', cursor: 'pointer' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{s.nome}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{s.tarefasTemplate.length} tarefa(s)</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="card p-5">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div className="sec-title" style={{ marginBottom: 0 }}>Revisão de tarefas</div>
                  <button type="button" onClick={reporSugestoes} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
                    <RotateCcw size={11} /> Repor sugestões
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>
                  Estas tarefas ficam guardadas no perfil deste cliente e são usadas para gerar os projectos mensais — editar aqui não afecta o serviço nem outros clientes.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {tarefas.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                      <input
                        style={{ flex: 2, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-secondary)' }}
                        value={t.titulo} onChange={e => updateTarefa(t.id, { titulo: e.target.value })}
                        placeholder="Título da tarefa"
                      />
                      <select
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer' }}
                        value={t.categoriaId}
                        onChange={e => {
                          const cat = categoriasConfig.find(c => c.id === e.target.value)
                          updateTarefa(t.id, { categoriaId: e.target.value, categoriaNome: cat?.nome || '' })
                        }}
                      >
                        <option value="">Sem categoria</option>
                        {categoriasConfig.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <select
                        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer' }}
                        value={t.frequencia} onChange={e => updateTarefa(t.id, { frequencia: e.target.value as Frequencia })}
                      >
                        {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', minWidth: 70, textAlign: 'right' }}>{t.servicoNome}</span>
                      <button type="button" onClick={() => removerTarefa(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {tarefas.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '14px 0' }}>Sem tarefas — escolhe serviços no passo anterior ou adiciona uma tarefa manualmente.</div>
                  )}
                </div>

                <button type="button" onClick={adicionarTarefaCustom} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
                  <Plus size={11} /> Adicionar tarefa
                </button>
              </div>
            )}

            {step === 4 && (
              <>
                <div className="card p-5">
                  <div className="sec-title">Configuração</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>MRR — Valor mensal (€)</label>
                      <input className="input" type="number" value={config4.mrr} onChange={e => setConfig4(f => ({ ...f, mrr: Number(e.target.value) }))} placeholder="0" />
                    </div>
                    <div>
                      <label style={labelStyle}>Estado</label>
                      <select className="select" value={config4.status} onChange={e => setConfig4(f => ({ ...f, status: e.target.value as ClienteStatus }))}>
                        <option value="ONBOARDING">Onboarding</option>
                        <option value="ATIVO">Ativo</option>
                        <option value="PAUSADO">Pausado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {temSite && (
                  <div className="card p-5">
                    <div className="sec-title">
                      Fase do site
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        — define quais tarefas são geradas mensalmente
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {FASES_SITE.map(f => (
                        <button
                          key={f.id} type="button"
                          onClick={() => setConfig4(x => ({ ...x, faseSite: f.id }))}
                          style={{
                            padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                            border: config4.faseSite === f.id ? '2px solid var(--brand)' : '1px solid var(--border-subtle)',
                            backgroundColor: config4.faseSite === f.id ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--bg-input)',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{f.label}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.desc}</div>
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <Info size={12} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-blue)' }} />
                      {config4.faseSite === 'SEM_SITE' && 'As tarefas mensais não incluem manutenção de site. Quando o site for entregue, altera para "Site entregue".'}
                      {config4.faseSite === 'EM_DESENVOLVIMENTO' && 'O projecto de criação do site está activo. As tarefas mensais não incluem manutenção ainda.'}
                      {config4.faseSite === 'ENTREGUE' && 'O site foi entregue. As tarefas mensais incluem manutenção, backups, SEO e actualizações.'}
                    </div>
                  </div>
                )}

                <div className="card p-5">
                  <div className="sec-title">Links</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { key: 'driveUrl', label: 'Google Drive' },
                      { key: 'canvaUrl', label: 'Canva' },
                      { key: 'dominioUrl', label: 'Domínio / Site' },
                      { key: 'whatsappUrl', label: 'Grupo WhatsApp' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label style={labelStyle}>{label}</label>
                        <input
                          className="input"
                          value={(config4 as Record<string, unknown>)[key] as string}
                          onChange={e => setConfig4(f => ({ ...f, [key]: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-5">
                  <label style={labelStyle}>Notas internas</label>
                  <textarea
                    className="input" rows={3}
                    value={config4.notas} onChange={e => setConfig4(f => ({ ...f, notas: e.target.value }))}
                    placeholder="Notas sobre este cliente..."
                    style={{ resize: 'none' }}
                  />
                </div>
              </>
            )}

            {erro && (
              <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--pill-red-bg)', color: 'var(--accent-red)', fontSize: 12 }}>{erro}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              {step === 1 ? (
                <button type="button" onClick={() => router.back()} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
              ) : (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  <ArrowLeft size={13} /> Voltar
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  disabled={!podeAvancar()}
                  onClick={() => step === 2 ? irParaTarefas() : setStep(s => s + 1)}
                  className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                >
                  Seguinte <ArrowRight size={13} />
                </button>
              ) : (
                <button type="button" disabled={loading} onClick={criarCliente} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Criar cliente
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
