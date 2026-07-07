'use client'

import { Users, Plus, Filter, LayoutKanban, Table } from 'lucide-react'
import Link from 'next/link'

const colunas = [
  { id: 'NOVO',        label: 'Novo',        color: 'text-accent-blue',   bg: 'border-t-sky-500',
    leads: [
      { empresa: 'Padaria Central',    origem: 'Instagram', plano: 'Growth',   score: 2, acao: 'Follow-up', dias: 'hoje' },
      { empresa: 'Clínica Dental Pro', origem: 'Landing',   plano: 'Presence', score: 3, acao: 'Ligar',     dias: 'ontem' },
    ]},
  { id: 'QUALIFICACAO', label: 'Qualificação', color: 'text-accent-purple', bg: 'border-t-violet-500',
    leads: [
      { empresa: 'Restaurante Mar',   origem: 'Cold',   plano: 'Growth',   score: 2, acao: 'Parado 5d',  dias: '5d', urgent: true },
      { empresa: 'Academia Fitness+', origem: 'Landing', plano: 'Presence', score: 4, acao: 'Qualificar', dias: '1d' },
    ]},
  { id: 'AUDITORIA', label: 'Auditoria', color: 'text-accent-teal', bg: 'border-t-cyan-500',
    leads: [
      { empresa: 'Spa Zen Z',       origem: 'Instagram', plano: 'Presence', score: 3, acao: 'Enviar audit.', dias: '2d', hot: true },
      { empresa: 'Boutique Moda L', origem: 'Instagram', plano: 'Growth',   score: 4, acao: 'Em curso',      dias: 'hoje' },
    ]},
  { id: 'REUNIAO', label: 'Reunião', color: 'text-accent-amber', bg: 'border-t-amber-500',
    leads: [
      { empresa: 'Clínica Beleza X', origem: 'Landing',   plano: 'Growth', score: 4, acao: 'Hoje 11h', dias: 'hoje', hot: true },
      { empresa: 'Pet Shop Amigos',  origem: 'Instagram',  plano: 'One',    score: 3, acao: 'Sex 10h',  dias: '4d' },
    ]},
  { id: 'PROPOSTA', label: 'Proposta', color: 'text-orange-400', bg: 'border-t-orange-500',
    leads: [
      { empresa: 'Ginásio FitLife', origem: 'Landing',   plano: 'Growth',   score: 4, acao: 'Aguarda 8d', dias: '8d', urgent: true },
      { empresa: 'Hotel Douro Y',   origem: 'Indicação', plano: 'Presence', score: 5, acao: 'Follow-up',  dias: '2d' },
    ]},
  { id: 'FECHADO', label: 'Fechado', color: 'text-accent-green', bg: 'border-t-green-500',
    leads: [
      { empresa: 'Hedro Casa', origem: 'Indicação', plano: 'Growth',   score: 5, acao: 'Onboarding', dias: '349€/m', won: true },
      { empresa: 'Studio K',   origem: 'Landing',   plano: 'Presence', score: 4, acao: 'Kickoff',    dias: '199€/m', won: true },
    ]},
]

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${
          i <= score
            ? score >= 4 ? 'bg-red-500' : score >= 3 ? 'bg-amber-500' : 'bg-sky-500'
            : 'bg-border-subtle'
        }`} />
      ))}
    </div>
  )
}

export default function LeadsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-bg-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[16px] font-medium text-text-primary">
            <Users size={18} className="text-accent-blue" /> Leads
          </div>
          <div className="flex bg-bg-input border border-border-subtle rounded-lg p-0.5">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] bg-sky-950 text-accent-blue">
              <LayoutKanban size={12} /> Kanban
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-text-muted">
              <Table size={12} /> Tabela
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input placeholder="Pesquisar lead..." className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-[12px] text-text-secondary outline-none w-36 focus:border-brand transition-colors" />
          <button className="btn btn-ghost"><Filter size={13} /> Filtrar</button>
          <Link href="/leads/novo" className="btn btn-primary"><Plus size={13} /> Novo lead</Link>
        </div>
      </div>

      <div className="flex gap-2.5 p-4 overflow-x-auto flex-1 items-start">
        {colunas.map((col) => (
          <div key={col.id} className="w-[200px] flex-shrink-0 flex flex-col gap-2">
            <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg card border-t-2 ${col.bg}`}>
              <span className={`text-[11px] font-medium uppercase tracking-wider ${col.color}`}>{col.label}</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-bg-input text-text-muted">{col.leads.length}</span>
            </div>

            {col.leads.map((lead, i) => (
              <div key={i} className={`card p-3 hover:border-border-strong cursor-pointer transition-all ${
                (lead as any).urgent ? 'border-l-2 border-l-red-500' :
                (lead as any).hot   ? 'border-l-2 border-l-brand'   :
                (lead as any).won   ? 'border-l-2 border-l-green-500 opacity-75' : ''
              }`}>
                <div className="text-[13px] font-medium text-text-primary mb-1.5">{lead.empresa}</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="pill pill-blue">{lead.origem}</span>
                  <span className="text-[10px] text-text-faint">{lead.plano}</span>
                </div>
                <ScoreDots score={lead.score} />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
                  <span className={`text-[10px] ${(lead as any).urgent ? 'text-accent-red' : (lead as any).hot ? 'text-accent-blue' : 'text-text-faint'}`}>
                    {lead.acao}
                  </span>
                  <span className="text-[10px] text-text-faint">{lead.dias}</span>
                </div>
              </div>
            ))}

            <button className="flex items-center gap-1.5 px-2.5 py-2 border border-dashed border-border-subtle rounded-lg text-[12px] text-text-faint hover:border-border-strong hover:text-text-muted transition-colors">
              <Plus size={12} /> Adicionar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
