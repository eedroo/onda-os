'use client'

import { useEffect, useState } from 'react'
import { Kanban, Plus, Calendar, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { projetosService, clientesService, type Projeto, type Cliente } from '@/lib/db'

const COLS = [
  { id: 'PLANEAMENTO', label: 'Planeamento', color: 'text-accent-blue',   border: 'border-t-sky-500' },
  { id: 'EXECUCAO',    label: 'Execução',    color: 'text-accent-amber',  border: 'border-t-amber-500' },
  { id: 'APROVACAO',   label: 'Aprovação',   color: 'text-orange-400',    border: 'border-t-orange-500' },
  { id: 'ENTREGA',     label: 'Entrega',     color: 'text-accent-purple', border: 'border-t-violet-500' },
  { id: 'CONCLUIDO',   label: 'Concluído',   color: 'text-accent-green',  border: 'border-t-green-500' },
]

const PLANO_COLOR: Record<string, string> = { ONE: 'pill-green', PRESENCE: 'pill-purple', GROWTH: 'pill-blue' }

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    Promise.all([projetosService.getAll(), clientesService.getAll()]).then(([p, c]) => {
      setProjetos(p); setClientes(c); setLoading(false)
    })
  }, [])

  async function criarMensais() {
    setCriando(true)
    const mes = new Date().getMonth() + 1
    const ano = new Date().getFullYear()
    for (const c of clientes.filter(x => x.status === 'ATIVO')) {
      if (!projetos.find(p => p.clienteId === c.id && p.mes === mes && p.ano === ano)) {
        await projetosService.criarMensal(c, mes, ano)
      }
    }
    const updated = await projetosService.getAll()
    setProjetos(updated)
    setCriando(false)
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin text-accent-blue" /></div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-bg-surface flex-shrink-0">
        <div className="flex items-center gap-2 text-[16px] font-medium text-text-primary">
          <Kanban size={18} className="text-accent-blue" /> Projetos
        </div>
        <div className="flex gap-2">
          <button onClick={criarMensais} disabled={criando} className="btn btn-ghost">
            {criando ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
            Criar projetos do mês
          </button>
          <Link href="/projetos/novo" className="btn btn-primary"><Plus size={13} /> Novo projeto</Link>
        </div>
      </div>

      <div className="flex items-center gap-5 px-5 py-2 border-b border-border-subtle text-[12px] text-text-muted flex-shrink-0">
        <span>Ativos <strong className="text-accent-blue ml-1">{projetos.filter(p => p.status !== 'CONCLUIDO').length}</strong></span>
        <span>Concluídos <strong className="text-accent-green ml-1">{projetos.filter(p => p.status === 'CONCLUIDO').length}</strong></span>
      </div>

      {projetos.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-sky-950 flex items-center justify-center">
            <Kanban size={20} className="text-accent-blue" />
          </div>
          <div className="text-[14px] font-medium text-text-primary">Sem projetos ainda</div>
          <div className="text-[12px] text-text-muted">Clica abaixo para gerar os projetos do mês para todos os clientes ativos</div>
          <button onClick={criarMensais} disabled={criando} className="btn btn-primary mt-1">
            {criando ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
            Criar projetos do mês
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5 p-4 overflow-x-auto flex-1 items-start">
          {COLS.map(col => {
            const items = projetos.filter(p => p.status === col.id)
            return (
              <div key={col.id} className="w-[220px] flex-shrink-0 flex flex-col gap-2">
                <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg card border-t-2 ${col.border}`}>
                  <span className={`text-[11px] font-medium uppercase tracking-wider ${col.color}`}>{col.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-input text-text-muted">{items.length}</span>
                </div>
                {items.map(p => (
                  <Link key={p.id} href={`/projetos/${p.id}`}>
                    <div className="card p-3 hover:border-border-strong cursor-pointer transition-all">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-[12.5px] font-medium text-text-primary leading-tight">{p.nome}</div>
                        <span className={`pill ${PLANO_COLOR[p.clientePlano]} text-[9px] flex-shrink-0`}>{p.clientePlano}</span>
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] text-text-faint mb-1">
                          <span>Progresso</span><span>{p.progresso}%</span>
                        </div>
                        <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${p.progresso}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
                        <span className="text-[10px] text-text-faint">
                          {new Date(p.ano, p.mes - 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-accent-blue">Ver →</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {items.length === 0 && (
                  <div className="px-3 py-6 text-center text-[11px] text-text-faint border border-dashed border-border-subtle rounded-lg">
                    Vazio
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
