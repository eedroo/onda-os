'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { clientesService, SERVICOS_BASE, type Plano, type ClienteStatus, type ServicoCliente } from '@/lib/db'

const PLANOS: Plano[] = ['ONE', 'PRESENCE', 'GROWTH']
const FREQUENCIAS = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']

export default function NovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    empresa: '', contacto: '', email: '', telefone: '',
    plano: 'GROWTH' as Plano, mrr: 0, status: 'ATIVO' as ClienteStatus,
    driveUrl: '', canvaUrl: '', dominioUrl: '', whatsappUrl: '', instagram: '', notas: '',
  })
  const [servicos, setServicos] = useState<ServicoCliente[]>(SERVICOS_BASE['GROWTH'])

  function onPlanoChange(plano: Plano) {
    setForm(f => ({ ...f, plano }))
    setServicos(SERVICOS_BASE[plano])
  }

  function updateServico(id: string, field: keyof ServicoCliente, value: unknown) {
    setServicos(s => s.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  function addServico() {
    setServicos(s => [...s, {
      id: `custom-${Date.now()}`, nome: '', ativo: true,
      frequencia: 'MENSAL', quantidade: 1, unidade: 'unidade',
    }])
  }

  function removeServico(id: string) {
    setServicos(s => s.filter(x => x.id !== id))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.empresa) return
    setLoading(true)
    try {
      await clientesService.create({ ...form, servicos })
      router.push('/clientes')
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle bg-bg-surface flex-shrink-0">
        <button onClick={() => router.back()} className="btn btn-ghost py-1 px-2"><ArrowLeft size={14} /></button>
        <div className="text-[16px] font-medium text-text-primary">Novo cliente</div>
      </div>

      <form onSubmit={onSubmit} className="flex-1 overflow-auto p-5">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">

          {/* Dados básicos */}
          <div className="card p-5">
            <div className="text-[10px] font-medium text-text-faint tracking-widest uppercase mb-4">Dados básicos</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">Empresa *</label>
                <input className="input" value={form.empresa} onChange={e => setForm(f => ({...f, empresa: e.target.value}))} required placeholder="Nome da empresa" />
              </div>
              <div>
                <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">Contacto</label>
                <input className="input" value={form.contacto} onChange={e => setForm(f => ({...f, contacto: e.target.value}))} placeholder="Nome do contacto" />
              </div>
              <div>
                <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@empresa.pt" />
              </div>
              <div>
                <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">Telefone</label>
                <input className="input" value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} placeholder="+351 9xx xxx xxx" />
              </div>
              <div>
                <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">Instagram</label>
                <input className="input" value={form.instagram} onChange={e => setForm(f => ({...f, instagram: e.target.value}))} placeholder="@handle" />
              </div>
            </div>
          </div>

          {/* Plano e MRR */}
          <div className="card p-5">
            <div className="text-[10px] font-medium text-text-faint tracking-widest uppercase mb-4">Plano & Faturação</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">Plano *</label>
                <select className="select" value={form.plano} onChange={e => onPlanoChange(e.target.value as Plano)}>
                  {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">MRR (€)</label>
                <input className="input" type="number" value={form.mrr} onChange={e => setForm(f => ({...f, mrr: Number(e.target.value)}))} placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">Estado</label>
                <select className="select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as ClienteStatus}))}>
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="PAUSADO">Pausado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Serviços personalizados */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-medium text-text-faint tracking-widest uppercase">Serviços & Frequências</div>
              <button type="button" onClick={addServico} className="btn btn-ghost py-1 text-[11px]">
                <Plus size={12} /> Adicionar serviço
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {servicos.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2.5 bg-bg-input rounded-lg border border-border-subtle">
                  <input
                    type="checkbox"
                    checked={s.ativo}
                    onChange={e => updateServico(s.id, 'ativo', e.target.checked)}
                    className="w-4 h-4 rounded accent-brand flex-shrink-0"
                  />
                  <input
                    className="flex-1 bg-transparent text-[12px] text-text-secondary outline-none"
                    value={s.nome}
                    onChange={e => updateServico(s.id, 'nome', e.target.value)}
                    placeholder="Nome do serviço"
                  />
                  <input
                    type="number"
                    className="w-12 bg-transparent text-[12px] text-text-secondary outline-none text-center"
                    value={s.quantidade}
                    onChange={e => updateServico(s.id, 'quantidade', Number(e.target.value))}
                  />
                  <input
                    className="w-16 bg-transparent text-[11px] text-text-faint outline-none"
                    value={s.unidade}
                    onChange={e => updateServico(s.id, 'unidade', e.target.value)}
                    placeholder="unidade"
                  />
                  <select
                    className="bg-transparent text-[11px] text-text-faint outline-none cursor-pointer"
                    value={s.frequencia}
                    onChange={e => updateServico(s.id, 'frequencia', e.target.value)}
                  >
                    {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button type="button" onClick={() => removeServico(s.id)} className="text-text-faint hover:text-accent-red transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="card p-5">
            <div className="text-[10px] font-medium text-text-faint tracking-widest uppercase mb-4">Links</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'driveUrl', label: 'Google Drive' },
                { key: 'canvaUrl', label: 'Canva' },
                { key: 'dominioUrl', label: 'Domínio / Site' },
                { key: 'whatsappUrl', label: 'Grupo WhatsApp' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">{label}</label>
                  <input
                    className="input"
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="card p-5">
            <label className="text-[10px] text-text-faint uppercase tracking-wide block mb-1.5">Notas internas</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.notas}
              onChange={e => setForm(f => ({...f, notas: e.target.value}))}
              placeholder="Notas sobre este cliente..."
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="btn btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Criar cliente
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
