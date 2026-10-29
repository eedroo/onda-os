'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  clientesService, projetosService, categoriasService, tarefasService,
  type Cliente, type Projeto, type Categoria, type Frequencia,
} from '@/lib/db'
import { DatePicker } from '@/components/ui/DatePicker'

const FREQUENCIAS: Frequencia[] = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']
const labelStyle = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

// Dos projectos do cliente, o mais recente que ainda não está concluído —
// mesma heurística usada no resto da app para escolher o projecto "actual".
function projetoAtual(projetos: Projeto[], clienteId: string): Projeto | null {
  const doCliente = projetos.filter(p => p.clienteId === clienteId)
  if (!doCliente.length) return null
  const ativos = doCliente.filter(p => p.status !== 'CONCLUIDO')
  const lista = ativos.length ? ativos : doCliente
  return [...lista].sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes))[0]
}

export function NovaTarefaButton({ className, style, children, clienteIdInicial, onCriada }: {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  // Pré-seleciona o cliente (e o respectivo projecto actual) ao abrir —
  // útil quando o botão já está no contexto de um cliente específico.
  clienteIdInicial?: string
  onCriada?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])
  const [clienteId, setClienteId] = useState('')
  const [projetoId, setProjetoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('')
  const [frequencia, setFrequencia] = useState<Frequencia>('MENSAL')
  const [dataLimite, setDataLimite] = useState('')

  async function abrir() {
    setOpen(true)
    setTitulo(''); setCategoria(''); setFrequencia('MENSAL'); setDataLimite('')
    setCarregando(true)
    try {
      const [c, p, cats] = await Promise.all([clientesService.getAll(), projetosService.getAll(), categoriasService.getAll()])
      setClientes(c)
      setProjetos(p)
      setCategoriasConfig(cats)
      const clienteDefeito = clienteIdInicial || ''
      setClienteId(clienteDefeito)
      setProjetoId(clienteDefeito ? (projetoAtual(p, clienteDefeito)?.id || '') : '')
    } catch (e) {
      console.error(e)
      toast.error('Não foi possível carregar clientes e projectos')
    } finally {
      setCarregando(false)
    }
  }

  function escolherCliente(novoClienteId: string) {
    setClienteId(novoClienteId)
    setProjetoId(novoClienteId ? (projetoAtual(projetos, novoClienteId)?.id || '') : '')
  }

  async function guardar() {
    if (!titulo.trim() || !clienteId || !projetoId) return
    setGuardando(true)
    try {
      const doProjeto = await tarefasService.getByProjeto(projetoId)
      const ordem = doProjeto.length ? Math.max(...doProjeto.map(t => t.ordem)) + 1 : 1
      await tarefasService.create({
        projetoId, clienteId, titulo: titulo.trim(),
        categoria: categoria || 'Outros', frequencia, status: 'PENDENTE', ordem,
        dataLimite: dataLimite || undefined,
      })
      toast.success('Tarefa criada')
      setOpen(false)
      onCriada?.()
    } catch (e) {
      console.error(e)
      toast.error('Não foi possível criar a tarefa')
    } finally {
      setGuardando(false)
    }
  }

  const projetosDoCliente = projetos.filter(p => p.clienteId === clienteId)

  return (
    <>
      <button onClick={abrir} className={className ?? 'btn btn-primary'} style={style}>
        {children || <><Plus size={13} /> Nova tarefa</>}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setOpen(false)}>
          <div className="card" style={{ width: 'min(460px, 94vw)', maxHeight: '90vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Nova tarefa</div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={16} /></button>
            </div>

            {carregando ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Título *</label>
                  <input autoFocus className="input" value={titulo} onChange={e => setTitulo(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && titulo.trim() && clienteId && projetoId) guardar() }}
                    placeholder="Título da tarefa" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Cliente *</label>
                    <select className="select" value={clienteId} onChange={e => escolherCliente(e.target.value)}>
                      <option value="">Escolhe um cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Projecto *</label>
                    <select className="select" value={projetoId} onChange={e => setProjetoId(e.target.value)} disabled={!clienteId}>
                      <option value="">{clienteId ? 'Escolhe um projecto' : 'Escolhe primeiro o cliente'}</option>
                      {projetosDoCliente.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    {clienteId && !projetosDoCliente.length && (
                      <div style={{ fontSize: 10, color: 'var(--accent-amber)', marginTop: 4 }}>Este cliente ainda não tem projectos</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Categoria</label>
                    <select className="select" value={categoria} onChange={e => setCategoria(e.target.value)}>
                      <option value="">Outros</option>
                      {categoriasConfig.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Frequência</label>
                    <select className="select" value={frequencia} onChange={e => setFrequencia(e.target.value as Frequencia)}>
                      {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Data limite</label>
                  <DatePicker value={dataLimite} onChange={setDataLimite} />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
                  <button onClick={guardar} disabled={guardando || !titulo.trim() || !clienteId || !projetoId} className="btn btn-primary">
                    {guardando ? <Loader2 size={12} className="animate-spin" /> : null} Criar tarefa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
