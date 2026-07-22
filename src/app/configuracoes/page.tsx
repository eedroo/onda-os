'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { Settings, Plus, Trash2, Pencil, Loader2, Check } from 'lucide-react'
import {
  categoriasService, servicosService, planosService, seedConfiguracoes,
  type Categoria, type Servico, type TarefaTemplate, type PlanoConfig, type Frequencia,
} from '@/lib/db'

type Tab = 'categorias' | 'servicos' | 'planos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'categorias', label: 'Categorias' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'planos', label: 'Planos' },
]

const FREQUENCIAS: Frequencia[] = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']

function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>('categorias')
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [planos, setPlanos] = useState<PlanoConfig[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      let [c, s, p] = await Promise.all([categoriasService.getAll(), servicosService.getAll(), planosService.getAll()])
      if (c.length === 0) {
        await seedConfiguracoes()
        ;[c, s, p] = await Promise.all([categoriasService.getAll(), servicosService.getAll(), planosService.getAll()])
      }
      setCategorias(c); setServicos(s); setPlanos(p)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function notify(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 2500)
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
          <Settings size={18} style={{ color: 'var(--accent-blue)' }} /> Configurações
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: tab === t.id ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: tab === t.id ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div style={{ margin: '10px 20px 0', padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--pill-green-bg)', color: 'var(--accent-green)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Check size={13} /> {feedback}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {tab === 'categorias' && (
            <CategoriasTab categorias={categorias} servicos={servicos} onReload={load} notify={notify} />
          )}
          {tab === 'servicos' && (
            <ServicosTab servicos={servicos} categorias={categorias} planos={planos} onReload={load} notify={notify} />
          )}
          {tab === 'planos' && (
            <PlanosTab planos={planos} servicos={servicos} onReload={load} notify={notify} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Categorias ────────────────────────────────────────────────────────

function CategoriasTab({ categorias, servicos, onReload, notify }: {
  categorias: Categoria[]; servicos: Servico[]; onReload: () => Promise<void>; notify: (m: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '' })
  const [saving, setSaving] = useState(false)

  function abrirNova() {
    setEditando(null)
    setForm({ nome: '', descricao: '' })
    setShowForm(true)
  }

  function abrirEditar(cat: Categoria) {
    setEditando(cat)
    setForm({ nome: cat.nome, descricao: cat.descricao || '' })
    setShowForm(true)
  }

  async function guardar() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      if (editando) {
        await categoriasService.update(editando.id!, { nome: form.nome, descricao: form.descricao || undefined })
        notify('Categoria actualizada')
      } else {
        await categoriasService.create({ nome: form.nome, descricao: form.descricao || undefined })
        notify('Categoria criada')
      }
      setShowForm(false)
      await onReload()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function eliminar(cat: Categoria) {
    const emUso = servicos.reduce((n, s) => n + s.tarefasTemplate.filter(t => t.categoriaId === cat.id).length, 0)
    const aviso = emUso > 0
      ? `A categoria "${cat.nome}" está em uso em ${emUso} tarefa(s) template. Eliminar mesmo assim?`
      : `Eliminar a categoria "${cat.nome}"?`
    if (!confirm(aviso)) return
    await categoriasService.delete(cat.id!)
    notify('Categoria eliminada')
    await onReload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={abrirNova} className="btn btn-primary"><Plus size={13} /> Nova categoria</button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 16 }}>
          <div className="sec-title">{editando ? 'Editar categoria' : 'Nova categoria'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da categoria" />
            </div>
            <div>
              <label style={labelStyle}>Descrição</label>
              <input className="input" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição (opcional)" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={guardar} disabled={saving || !form.nome.trim()} className="btn btn-primary">
                {saving ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {categorias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-faint)', fontSize: 13 }}>Sem categorias ainda</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categorias.map(cat => (
            <div key={cat.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{cat.nome}</div>
                {cat.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{cat.descricao}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => abrirEditar(cat)} className="btn btn-ghost" style={{ padding: '4px 8px' }}><Pencil size={12} /></button>
                <button onClick={() => eliminar(cat)} className="btn btn-danger" style={{ padding: '4px 8px' }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Serviços ──────────────────────────────────────────────────────────

function ServicosTab({ servicos, categorias, planos, onReload, notify }: {
  servicos: Servico[]; categorias: Categoria[]; planos: PlanoConfig[]; onReload: () => Promise<void>; notify: (m: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Servico | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tarefas, setTarefas] = useState<TarefaTemplate[]>([])
  const [saving, setSaving] = useState(false)

  function abrirNovo() {
    setEditando(null)
    setNome(''); setDescricao(''); setTarefas([])
    setShowForm(true)
  }

  function abrirEditar(s: Servico) {
    setEditando(s)
    setNome(s.nome); setDescricao(s.descricao || ''); setTarefas(s.tarefasTemplate.map(t => ({ ...t })))
    setShowForm(true)
  }

  function adicionarTarefa() {
    const catDefault = categorias[0]
    setTarefas(t => [...t, {
      id: gerarId('tpl'), titulo: '', categoriaId: catDefault?.id || '', categoriaNome: catDefault?.nome || '',
      frequencia: 'MENSAL', ordem: t.length + 1,
    }])
  }

  function atualizarTarefa(id: string, patch: Partial<TarefaTemplate>) {
    setTarefas(t => t.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  function removerTarefa(id: string) {
    setTarefas(t => t.filter(x => x.id !== id))
  }

  async function guardar() {
    if (!nome.trim()) return
    setSaving(true)
    try {
      const payload = { nome, descricao: descricao || undefined, tarefasTemplate: tarefas }
      if (editando) {
        await servicosService.update(editando.id!, payload)
        notify('Serviço actualizado')
      } else {
        await servicosService.create(payload)
        notify('Serviço criado')
      }
      setShowForm(false)
      await onReload()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function eliminar(s: Servico) {
    const emUso = planos.filter(p => p.servicoIds.includes(s.id!)).length
    const aviso = emUso > 0
      ? `O serviço "${s.nome}" está incluído em ${emUso} plano(s). Eliminar mesmo assim?`
      : `Eliminar o serviço "${s.nome}"?`
    if (!confirm(aviso)) return
    await servicosService.delete(s.id!)
    notify('Serviço eliminado')
    await onReload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={abrirNovo} className="btn btn-primary"><Plus size={13} /> Novo serviço</button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 16 }}>
          <div className="sec-title">{editando ? 'Editar serviço' : 'Novo serviço'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nome do serviço *</label>
              <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do serviço" />
            </div>
            <div>
              <label style={labelStyle}>Descrição</label>
              <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>Tarefas template</div>
            <button type="button" onClick={adicionarTarefa} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
              <Plus size={11} /> Adicionar tarefa
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {tarefas.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <input
                  style={{ flex: 2, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-secondary)' }}
                  value={t.titulo} onChange={e => atualizarTarefa(t.id, { titulo: e.target.value })}
                  placeholder="Título da tarefa"
                />
                <select
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer' }}
                  value={t.categoriaId}
                  onChange={e => {
                    const cat = categorias.find(c => c.id === e.target.value)
                    atualizarTarefa(t.id, { categoriaId: e.target.value, categoriaNome: cat?.nome || '' })
                  }}
                >
                  <option value="">Sem categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <select
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer' }}
                  value={t.frequencia} onChange={e => atualizarTarefa(t.id, { frequencia: e.target.value as Frequencia })}
                >
                  {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input
                  type="number"
                  style={{ width: 40, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}
                  value={t.ordem} onChange={e => atualizarTarefa(t.id, { ordem: Number(e.target.value) })}
                  title="Ordem"
                />
                <button type="button" onClick={() => removerTarefa(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {tarefas.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '10px 0' }}>Sem tarefas template ainda</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={guardar} disabled={saving || !nome.trim()} className="btn btn-primary">
              {saving ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
            </button>
          </div>
        </div>
      )}

      {servicos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-faint)', fontSize: 13 }}>Sem serviços ainda</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {servicos.map(s => (
            <div key={s.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {s.descricao ? `${s.descricao} · ` : ''}{s.tarefasTemplate.length} tarefa(s) template
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => abrirEditar(s)} className="btn btn-ghost" style={{ padding: '4px 8px' }}><Pencil size={12} /></button>
                <button onClick={() => eliminar(s)} className="btn btn-danger" style={{ padding: '4px 8px' }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Planos ────────────────────────────────────────────────────────────

function PlanosTab({ planos, servicos, onReload, notify }: {
  planos: PlanoConfig[]; servicos: Servico[]; onReload: () => Promise<void>; notify: (m: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<PlanoConfig | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ordem, setOrdem] = useState(1)
  const [servicoIds, setServicoIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function abrirNovo() {
    setEditando(null)
    setNome(''); setDescricao(''); setOrdem(planos.length + 1); setServicoIds([])
    setShowForm(true)
  }

  function abrirEditar(p: PlanoConfig) {
    setEditando(p)
    setNome(p.nome); setDescricao(p.descricao || ''); setOrdem(p.ordem); setServicoIds([...p.servicoIds])
    setShowForm(true)
  }

  function toggleServico(id: string) {
    setServicoIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  async function guardar() {
    if (!nome.trim()) return
    setSaving(true)
    try {
      const servicoNomes = servicoIds.map(id => servicos.find(s => s.id === id)?.nome || '').filter(Boolean)
      const payload = { nome, descricao: descricao || undefined, servicoIds, servicoNomes, ordem }
      if (editando) {
        await planosService.update(editando.id!, payload)
        notify('Plano actualizado')
      } else {
        await planosService.create(payload)
        notify('Plano criado')
      }
      setShowForm(false)
      await onReload()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function eliminar(p: PlanoConfig) {
    if (!confirm(`Eliminar o plano "${p.nome}"?`)) return
    await planosService.delete(p.id!)
    notify('Plano eliminado')
    await onReload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={abrirNovo} className="btn btn-primary"><Plus size={13} /> Novo plano</button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 16 }}>
          <div className="sec-title">{editando ? 'Editar plano' : 'Novo plano'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Nome do plano *</label>
              <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: GROWTH" />
            </div>
            <div>
              <label style={labelStyle}>Ordem de exibição</label>
              <input className="input" type="number" value={ordem} onChange={e => setOrdem(Number(e.target.value))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Descrição</label>
              <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)" />
            </div>
          </div>

          <label style={labelStyle}>Serviços incluídos</label>
          {servicos.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '8px 0' }}>Cria serviços primeiro na tab Serviços</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {servicos.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={servicoIds.includes(s.id!)} onChange={() => toggleServico(s.id!)}
                    style={{ width: 14, height: 14, accentColor: 'var(--brand)', cursor: 'pointer' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.nome}</span>
                </label>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={guardar} disabled={saving || !nome.trim()} className="btn btn-primary">
              {saving ? <Loader2 size={12} className="animate-spin" /> : null} Guardar
            </button>
          </div>
        </div>
      )}

      {planos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-faint)', fontSize: 13 }}>Sem planos ainda</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {planos.map(p => (
            <div key={p.id} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: p.servicoNomes.length ? 8 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.nome} <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 400 }}>#{p.ordem}</span></div>
                  {p.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.descricao}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => abrirEditar(p)} className="btn btn-ghost" style={{ padding: '4px 8px' }}><Pencil size={12} /></button>
                  <button onClick={() => eliminar(p)} className="btn btn-danger" style={{ padding: '4px 8px' }}><Trash2 size={12} /></button>
                </div>
              </div>
              {p.servicoNomes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {p.servicoNomes.map(nome => <span key={nome} className="pill pill-blue">{nome}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
