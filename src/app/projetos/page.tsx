'use client'

import { useEffect, useState } from 'react'
import { Kanban, Plus, Calendar, Loader2, Info } from 'lucide-react'
import Link from 'next/link'
import { projetosService, clientesService, type Projeto, type Cliente } from '@/lib/db'

const COLS = [
  { id: 'PLANEAMENTO', label: 'Planeamento', color: 'var(--accent-blue)',   border: 'var(--accent-blue)' },
  { id: 'EXECUCAO',    label: 'Execução',    color: 'var(--accent-amber)',  border: 'var(--accent-amber)' },
  { id: 'APROVACAO',   label: 'Aprovação',   color: '#fb923c',              border: '#fb923c' },
  { id: 'ENTREGA',     label: 'Entrega',     color: 'var(--accent-purple)', border: 'var(--accent-purple)' },
  { id: 'CONCLUIDO',   label: 'Concluído',   color: 'var(--accent-green)',  border: 'var(--accent-green)' },
]

const PLANO_COLOR: Record<string, string> = { ONE: 'pill-green', PRESENCE: 'pill-purple', GROWTH: 'pill-blue' }

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [p, c] = await Promise.all([projetosService.getAll(), clientesService.getAll()])
      setProjetos(p)
      setClientes(c)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function criarMensais() {
    setCriando(true)
    setFeedback(null)
    try {
      const mes = new Date().getMonth() + 1
      const ano = new Date().getFullYear()
      const ativos = clientes.filter(c => c.status === 'ATIVO')
      const inactivos = clientes.length - ativos.length
      let criados = 0
      let jaExistiam = 0
      for (const c of ativos) {
        const existe = projetos.find(p => p.clienteId === c.id && p.mes === mes && p.ano === ano)
        if (existe) { jaExistiam++; continue }
        await projetosService.criarMensal(c, mes, ano)
        criados++
      }
      await load()
      if (ativos.length === 0) {
        setFeedback('Nenhum cliente está "Ativo" — muda o estado do cliente para gerar o projecto mensal.')
      } else if (criados === 0) {
        setFeedback(`Nenhum projecto novo criado — os ${jaExistiam} cliente(s) activo(s) já tinham projecto este mês.${inactivos > 0 ? ` (${inactivos} cliente(s) não activo(s) foram ignorados.)` : ''}`)
      } else {
        setFeedback(`${criados} projecto(s) criado(s)${jaExistiam > 0 ? `, ${jaExistiam} já existiam` : ''}.`)
      }
    } catch (e) {
      console.error(e)
      setFeedback('Ocorreu um erro ao criar os projectos. Tenta novamente.')
    } finally {
      setCriando(false)
    }
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
          <Kanban size={18} style={{ color: 'var(--accent-blue)' }} /> Projetos
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={criarMensais} disabled={criando} className="btn btn-ghost">
            {criando ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
            Criar projetos do mês
          </button>
          <Link href="/projetos/novo" className="btn btn-primary"><Plus size={13} /> Novo projeto</Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
        <span>Ativos <strong style={{ color: 'var(--accent-blue)', marginLeft: 4 }}>{projetos.filter(p => p.status !== 'CONCLUIDO').length}</strong></span>
        <span>Concluídos <strong style={{ color: 'var(--accent-green)', marginLeft: 4 }}>{projetos.filter(p => p.status === 'CONCLUIDO').length}</strong></span>
      </div>

      {feedback && (
        <div style={{ margin: '10px 20px 0', padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--pill-blue-bg)', color: 'var(--accent-blue)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Info size={13} /> {feedback}
        </div>
      )}

      {projetos.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center' }}>
          <Kanban size={32} style={{ color: 'var(--accent-blue)', opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Sem projetos ainda</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Adiciona clientes primeiro, depois clica em "Criar projetos do mês"</div>
          <button onClick={criarMensais} disabled={criando} className="btn btn-primary" style={{ marginTop: 4 }}>
            {criando ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
            Criar projetos do mês
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, padding: 16, overflowX: 'auto', flex: 1, alignItems: 'flex-start' }}>
          {COLS.map(col => {
            const items = projetos.filter(p => p.status === col.id)
            return (
              <div key={col.id} style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderTop: `2px solid ${col.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>{items.length}</span>
                </div>
                {items.map(p => (
                  <Link key={p.id} href={`/projetos/${p.id}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ padding: 12, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.nome}</div>
                        <span className={`pill ${PLANO_COLOR[p.clientePlano]}`} style={{ fontSize: 9, flexShrink: 0 }}>{p.clientePlano}</span>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>
                          <span>Progresso</span><span>{p.progresso}%</span>
                        </div>
                        <div style={{ height: 3, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.progresso}%`, backgroundColor: 'var(--brand)', borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--accent-blue)', textAlign: 'right', marginTop: 4 }}>Ver tarefas →</div>
                    </div>
                  </Link>
                ))}
                {items.length === 0 && (
                  <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', border: '1px dashed var(--border-subtle)', borderRadius: 8 }}>Vazio</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
