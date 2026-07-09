'use client'

import { useEffect, useState } from 'react'
import { Briefcase, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { clientesService, type Cliente } from '@/lib/db'

const PLANO_COLOR: Record<string, string> = { ONE: 'pill-green', PRESENCE: 'pill-purple', GROWTH: 'pill-blue' }
const STATUS_COLOR: Record<string, string> = { ATIVO: 'text-accent-green', ONBOARDING: 'text-accent-amber', PAUSADO: 'text-text-muted', CANCELADO: 'text-accent-red' }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { clientesService.getAll().then(c => { setClientes(c); setLoading(false) }) }, [])

  const mrr = clientes.filter(c => c.status === 'ATIVO').reduce((s, c) => s + c.mrr, 0)

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin text-accent-blue" /></div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-bg-surface flex-shrink-0">
        <div className="flex items-center gap-2 text-[16px] font-medium text-text-primary">
          <Briefcase size={18} className="text-accent-blue" /> Clientes
        </div>
        <Link href="/clientes/novo" className="btn btn-primary"><Plus size={13} /> Novo cliente</Link>
      </div>

      <div className="grid grid-cols-4 gap-3 p-5 flex-shrink-0 border-b border-border-subtle">
        <div className="card p-3.5 border-t-2 border-t-sky-500">
          <div className="text-[11px] text-text-muted mb-1">Total</div>
          <div className="text-xl font-medium text-accent-blue">{clientes.length}</div>
        </div>
        <div className="card p-3.5 border-t-2 border-t-green-500">
          <div className="text-[11px] text-text-muted mb-1">Ativos</div>
          <div className="text-xl font-medium text-accent-green">{clientes.filter(c => c.status === 'ATIVO').length}</div>
        </div>
        <div className="card p-3.5 border-t-2 border-t-amber-500">
          <div className="text-[11px] text-text-muted mb-1">Onboarding</div>
          <div className="text-xl font-medium text-accent-amber">{clientes.filter(c => c.status === 'ONBOARDING').length}</div>
        </div>
        <div className="card p-3.5 border-t-2 border-t-violet-500">
          <div className="text-[11px] text-text-muted mb-1">MRR Total</div>
          <div className="text-xl font-medium text-accent-purple">{mrr.toLocaleString('pt-PT')}€</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-sky-950 flex items-center justify-center"><Briefcase size={20} className="text-accent-blue" /></div>
            <div className="text-[14px] font-medium text-text-primary">Sem clientes ainda</div>
            <div className="text-[12px] text-text-muted">Adiciona o teu primeiro cliente para começar</div>
            <Link href="/clientes/novo" className="btn btn-primary mt-1"><Plus size={13} /> Adicionar cliente</Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {clientes.map(c => (
              <Link key={c.id} href={`/clientes/${c.id}`}>
                <div className="card p-4 hover:border-border-strong cursor-pointer transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-950 flex items-center justify-center text-[13px] font-semibold text-accent-blue">
                      {c.empresa.slice(0,2).toUpperCase()}
                    </div>
                    <span className={`pill ${PLANO_COLOR[c.plano]}`}>{c.plano}</span>
                  </div>
                  <div className="text-[13px] font-medium text-text-primary mb-1">{c.empresa}</div>
                  <div className="text-[11px] text-text-muted mb-3">{c.contacto || '—'}</div>
                  <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                    <span className={`text-[11px] font-medium ${STATUS_COLOR[c.status]}`}>● {c.status}</span>
                    <span className="text-[13px] font-medium text-accent-green">{c.mrr}€/m</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
