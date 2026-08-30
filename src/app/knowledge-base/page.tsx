'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  BookOpen, Search, Plus, Star, Pencil, Trash2, Copy, ArrowLeft, Loader2,
  Building2, Handshake, ClipboardList, Sparkles, Palette, FolderOpen,
} from 'lucide-react'
import { kbService, seedKB, type KBDoc, type DocTipo, type DocCategoria } from '@/lib/db'

const CATEGORIAS: { id: DocCategoria; label: string; desc: string; icon: typeof Building2; cor: string }[] = [
  { id: 'AGENCIA', label: 'Agência', desc: 'Planos e processos internos', icon: Building2, cor: 'var(--accent-blue)' },
  { id: 'COMERCIAL', label: 'Comercial', desc: 'Scripts, funil, objecções', icon: Handshake, cor: 'var(--accent-purple)' },
  { id: 'OPERACIONAL', label: 'Operacional', desc: 'SOPs e checklists', icon: ClipboardList, cor: 'var(--accent-teal)' },
  { id: 'IA', label: 'IA & Prompts', desc: 'Prompts para o dia-a-dia', icon: Sparkles, cor: 'var(--accent-amber)' },
  { id: 'DESIGN', label: 'Design', desc: 'Guidelines visuais', icon: Palette, cor: 'var(--accent-green)' },
  { id: 'OUTRO', label: 'Outro', desc: 'Diversos', icon: FolderOpen, cor: 'var(--text-muted)' },
]
const CATEGORIAS_SIDEBAR = CATEGORIAS.filter(c => c.id !== 'OUTRO')

const TIPOS: { id: DocTipo; label: string; cls: string }[] = [
  { id: 'SOP', label: 'SOP', cls: 'pill-blue' },
  { id: 'SCRIPT', label: 'Script', cls: 'pill-purple' },
  { id: 'PROMPT', label: 'Prompt', cls: 'pill-amber' },
  { id: 'REFERENCIA', label: 'Referência', cls: 'pill-green' },
  { id: 'TEMPLATE', label: 'Template', cls: 'pill-gray' },
  { id: 'OUTRO', label: 'Outro', cls: 'pill-gray' },
]
const TIPOS_SIDEBAR = TIPOS.filter(t => t.id !== 'OUTRO')
const TIPO_INFO = Object.fromEntries(TIPOS.map(t => [t.id, t])) as unknown as Record<DocTipo, { label: string; cls: string }>
const CATEGORIA_INFO = Object.fromEntries(CATEGORIAS.map(c => [c.id, c])) as unknown as Record<DocCategoria, { label: string; desc: string; icon: typeof Building2; cor: string }>

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

function formatarData(ts?: { toDate: () => Date }) {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return '—' }
}

function renderInline(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**')
      ? <strong key={i} style={{ color: 'var(--text-primary)' }}>{parte.slice(2, -2)}</strong>
      : <span key={i}>{parte}</span>
  )
}

function ConteudoFormatado({ texto }: { texto: string }) {
  const blocos = texto.split(/\n\n+/)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {blocos.map((bloco, i) => {
        const linhas = bloco.split('\n').filter(l => l.trim())
        if (!linhas.length) return null
        if (linhas[0].startsWith('## ')) {
          return <div key={i} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: i ? 6 : 0 }}>{renderInline(linhas[0].slice(3))}</div>
        }
        const isLista = linhas.every(l => /^[-*]\s/.test(l.trim()))
        if (isLista) {
          return (
            <ul key={i} style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {linhas.map((l, j) => <li key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{renderInline(l.trim().replace(/^[-*]\s/, ''))}</li>)}
            </ul>
          )
        }
        return (
          <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {linhas.map((l, j) => <span key={j}>{renderInline(l)}{j < linhas.length - 1 && <br />}</span>)}
          </p>
        )
      })}
    </div>
  )
}

type Vista = 'grid' | 'doc' | 'novo'

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KBDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<DocCategoria | 'TODOS'>('TODOS')
  const [tipoFiltro, setTipoFiltro] = useState<DocTipo | 'TODOS'>('TODOS')
  const [vista, setVista] = useState<Vista>('grid')
  const [docActivoId, setDocActivoId] = useState<string | null>(null)
  const [modoEdicao, setModoEdicao] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      await seedKB()
      setDocs(await kbService.getAll())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const docActivo = docs.find(d => d.id === docActivoId) || null

  const docsFiltrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase()
    return docs.filter(d => {
      if (categoriaFiltro !== 'TODOS' && d.categoria !== categoriaFiltro) return false
      if (tipoFiltro !== 'TODOS' && d.tipo !== tipoFiltro) return false
      if (q && !d.titulo.toLowerCase().includes(q) && !(d.tags || []).some(t => t.toLowerCase().includes(q))) return false
      return true
    })
  }, [docs, categoriaFiltro, tipoFiltro, pesquisa])

  const recentes = useMemo(() => [...docs].sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0)).slice(0, 3), [docs])

  function abrirDoc(id: string) {
    setDocActivoId(id)
    setModoEdicao(false)
    setVista('doc')
  }
  function filtrarCategoria(cat: DocCategoria | 'TODOS') {
    setCategoriaFiltro(cat)
    setVista('grid')
  }
  function filtrarTipo(tipo: DocTipo | 'TODOS') {
    setTipoFiltro(tipo)
    setVista('grid')
  }

  async function toggleFavorito(doc: KBDoc) {
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, favorito: !d.favorito } : d))
    await kbService.toggleFavorito(doc.id!, !doc.favorito)
  }
  async function eliminarDoc(doc: KBDoc) {
    if (!confirm(`Eliminar "${doc.titulo}"?`)) return
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    setVista('grid')
    await kbService.delete(doc.id!)
  }
  async function copiarPrompt(doc: KBDoc) {
    await navigator.clipboard.writeText(doc.conteudo)
    toast.success('Prompt copiado')
  }
  function handleCriado(novo: KBDoc) {
    setDocs(prev => [novo, ...prev])
    setDocActivoId(novo.id!)
    setModoEdicao(false)
    setVista('doc')
  }
  function handleAtualizado(atualizado: KBDoc) {
    setDocs(prev => prev.map(d => d.id === atualizado.id ? atualizado : d))
    setModoEdicao(false)
  }

  if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg-base)' }}>

      {/* Painel esquerdo */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', padding: 14, gap: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          <BookOpen size={16} style={{ color: 'var(--accent-blue)' }} /> Knowledge Base
        </div>

        <button onClick={() => { setVista('novo'); setDocActivoId(null) }} className="btn btn-primary" style={{ justifyContent: 'center' }}>
          <Plus size={13} /> Novo documento
        </button>

        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--text-faint)' }} />
          <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar..." className="input" style={{ paddingLeft: 26 }} />
        </div>

        <div>
          <div className="sec-title">Categorias</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FiltroItem label="Tudo" ativo={categoriaFiltro === 'TODOS'} contagem={docs.length} onClick={() => filtrarCategoria('TODOS')} />
            {CATEGORIAS_SIDEBAR.map(c => (
              <FiltroItem key={c.id} label={c.label} ativo={categoriaFiltro === c.id} contagem={docs.filter(d => d.categoria === c.id).length} onClick={() => filtrarCategoria(c.id)} />
            ))}
          </div>
        </div>

        <div>
          <div className="sec-title">Tipo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FiltroItem label="Tudo" ativo={tipoFiltro === 'TODOS'} contagem={docs.length} onClick={() => filtrarTipo('TODOS')} />
            {TIPOS_SIDEBAR.map(t => (
              <FiltroItem key={t.id} label={`${t.label}s`} ativo={tipoFiltro === t.id} contagem={docs.filter(d => d.tipo === t.id).length} onClick={() => filtrarTipo(t.id)} />
            ))}
          </div>
        </div>

        <div>
          <div className="sec-title">Recentes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentes.map(d => (
              <button key={d.id} onClick={() => abrirDoc(d.id!)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.titulo}
              </button>
            ))}
            {!recentes.length && <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '4px 8px' }}>Sem documentos</div>}
          </div>
        </div>
      </div>

      {/* Painel direito */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
        {vista === 'grid' && (
          <GridView docsFiltrados={docsFiltrados} pesquisa={pesquisa} categoriaFiltro={categoriaFiltro} tipoFiltro={tipoFiltro}
            onSelecionarCategoria={filtrarCategoria} onAbrirDoc={abrirDoc} />
        )}
        {vista === 'doc' && docActivo && !modoEdicao && (
          <DocView doc={docActivo} onVoltar={() => setVista('grid')} onEditar={() => setModoEdicao(true)}
            onFavorito={() => toggleFavorito(docActivo)} onEliminar={() => eliminarDoc(docActivo)} onCopiar={() => copiarPrompt(docActivo)} />
        )}
        {vista === 'doc' && docActivo && modoEdicao && (
          <DocForm docExistente={docActivo} onCancelar={() => setModoEdicao(false)} onGuardado={handleAtualizado} />
        )}
        {vista === 'novo' && (
          <DocForm onCancelar={() => setVista('grid')} onGuardado={handleCriado} />
        )}
      </div>
    </div>
  )
}

function FiltroItem({ label, ativo, contagem, onClick }: { label: string; ativo: boolean; contagem: number; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', borderRadius: 6, background: ativo ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: ativo ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: ativo ? 500 : 400 }}>
      <span>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{contagem}</span>
    </button>
  )
}

function GridView({ docsFiltrados, pesquisa, categoriaFiltro, tipoFiltro, onSelecionarCategoria, onAbrirDoc }: {
  docsFiltrados: KBDoc[]; pesquisa: string; categoriaFiltro: DocCategoria | 'TODOS'; tipoFiltro: DocTipo | 'TODOS'
  onSelecionarCategoria: (c: DocCategoria | 'TODOS') => void; onAbrirDoc: (id: string) => void
}) {
  const semResultados = docsFiltrados.length === 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
        {CATEGORIAS.map(cat => {
          const Icon = cat.icon
          const total = docsFiltrados.filter(d => d.categoria === cat.id).length
          const ativo = categoriaFiltro === cat.id
          return (
            <button key={cat.id} onClick={() => onSelecionarCategoria(ativo ? 'TODOS' : cat.id)} className="card"
              style={{ padding: 14, textAlign: 'left', cursor: 'pointer', border: ativo ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', borderTop: `2px solid ${cat.cor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Icon size={16} style={{ color: cat.cor }} />
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{total}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{cat.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{cat.desc}</div>
            </button>
          )
        })}
      </div>

      {semResultados ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Sem resultados{pesquisa ? ` para "${pesquisa}"` : ''}</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Tenta outra pesquisa ou remove os filtros activos</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {CATEGORIAS.filter(cat => categoriaFiltro === 'TODOS' || categoriaFiltro === cat.id).map(cat => {
            const docsDaCategoria = docsFiltrados.filter(d => d.categoria === cat.id && (tipoFiltro === 'TODOS' || d.tipo === tipoFiltro))
            if (!docsDaCategoria.length) return null
            return (
              <div key={cat.id}>
                <div className="sec-title">{cat.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {docsDaCategoria.map(doc => (
                    <button key={doc.id} onClick={() => onAbrirDoc(doc.id!)} className="card"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}>
                      {doc.favorito && <Star size={12} style={{ color: 'var(--accent-amber)', fill: 'var(--accent-amber)', flexShrink: 0 }} />}
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.titulo}</span>
                      <span className={`pill ${TIPO_INFO[doc.tipo].cls}`}>{TIPO_INFO[doc.tipo].label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', flexShrink: 0 }}>{formatarData(doc.updatedAt as unknown as { toDate: () => Date } | undefined)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DocView({ doc, onVoltar, onEditar, onFavorito, onEliminar, onCopiar }: {
  doc: KBDoc; onVoltar: () => void; onEditar: () => void; onFavorito: () => void; onEliminar: () => void; onCopiar: () => void
}) {
  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={onVoltar} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ArrowLeft size={14} /></button>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{CATEGORIA_INFO[doc.categoria].label} → {doc.titulo}</span>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{doc.titulo}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`pill ${TIPO_INFO[doc.tipo].cls}`}>{TIPO_INFO[doc.tipo].label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Actualizado em {formatarData(doc.updatedAt as unknown as { toDate: () => Date } | undefined)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {doc.tipo === 'PROMPT' && (
              <button onClick={onCopiar} className="btn btn-ghost"><Copy size={12} /> Copiar prompt</button>
            )}
            <button onClick={onFavorito} className="btn btn-ghost">
              <Star size={12} style={{ color: doc.favorito ? 'var(--accent-amber)' : undefined, fill: doc.favorito ? 'var(--accent-amber)' : 'none' }} /> Favorito
            </button>
            <button onClick={onEditar} className="btn btn-ghost"><Pencil size={12} /> Editar</button>
            <button onClick={onEliminar} className="btn btn-ghost" style={{ color: 'var(--accent-red)' }}><Trash2 size={12} /> Eliminar</button>
          </div>
        </div>

        {!!(doc.tags || []).length && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {(doc.tags || []).map(t => <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>#{t}</span>)}
          </div>
        )}

        <ConteudoFormatado texto={doc.conteudo} />
      </div>
    </div>
  )
}

function DocForm({ docExistente, onCancelar, onGuardado }: { docExistente?: KBDoc; onCancelar: () => void; onGuardado: (doc: KBDoc) => void }) {
  const [titulo, setTitulo] = useState(docExistente?.titulo || '')
  const [tipo, setTipo] = useState<DocTipo>(docExistente?.tipo || 'SOP')
  const [categoria, setCategoria] = useState<DocCategoria>(docExistente?.categoria || 'OPERACIONAL')
  const [tagsTexto, setTagsTexto] = useState((docExistente?.tags || []).join(', '))
  const [conteudo, setConteudo] = useState(docExistente?.conteudo || '')
  const [salvando, setSalvando] = useState(false)

  const valido = titulo.trim().length > 0 && conteudo.trim().length > 0

  async function guardar() {
    if (!valido) return
    setSalvando(true)
    try {
      const tags = tagsTexto.split(',').map(t => t.trim()).filter(Boolean)
      if (docExistente) {
        const dados: Partial<KBDoc> = { titulo: titulo.trim(), tipo, categoria, tags, conteudo }
        await kbService.update(docExistente.id!, dados)
        onGuardado({ ...docExistente, ...dados })
      } else {
        const dados: Omit<KBDoc, 'id' | 'createdAt' | 'updatedAt'> = { titulo: titulo.trim(), tipo, categoria, tags, conteudo, favorito: false }
        const id = await kbService.create(dados)
        onGuardado({ id, ...dados })
      }
    } catch (e) { console.error(e) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="card" style={{ padding: 20 }}>
        <div className="sec-title">{docExistente ? 'Editar documento' : 'Novo documento'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Título *</label>
            <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do documento" autoFocus />
          </div>
          <div className="onda-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select className="select" value={tipo} onChange={e => setTipo(e.target.value as DocTipo)}>
                {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Categoria</label>
              <select className="select" value={categoria} onChange={e => setCategoria(e.target.value as DocCategoria)}>
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tags (separadas por vírgula)</label>
            <input className="input" value={tagsTexto} onChange={e => setTagsTexto(e.target.value)} placeholder="ex: sop, growth, checklist" />
          </div>
          <div>
            <label style={labelStyle}>Conteúdo *</label>
            <textarea className="input" rows={14} value={conteudo} onChange={e => setConteudo(e.target.value)} style={{ resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: 12 }} placeholder="Podes usar ## para títulos, - para listas e **texto** para negrito" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onCancelar} className="btn btn-ghost">Cancelar</button>
          <button onClick={guardar} disabled={!valido || salvando} className="btn btn-primary" style={{ opacity: (!valido || salvando) ? 0.6 : 1 }}>
            {salvando ? <Loader2 size={12} className="animate-spin" /> : null} {docExistente ? 'Guardar' : 'Criar documento'}
          </button>
        </div>
      </div>
    </div>
  )
}
