'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2, Info, Save } from 'lucide-react'
import {
  clientesService, planosService, servicosService, asPlano, SERVICOS_BASE,
  type Plano, type ClienteStatus, type ServicoCliente, type PlanoConfig, type Servico,
} from '@/lib/db'

const FREQUENCIAS = ['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PONTUAL']

type FaseSite = 'SEM_SITE' | 'EM_DESENVOLVIMENTO' | 'ENTREGUE'

const FASES_SITE: { id: FaseSite; label: string; desc: string }[] = [
  { id: 'SEM_SITE',          label: 'Sem site ainda',      desc: 'Tarefas de criação activas' },
  { id: 'EM_DESENVOLVIMENTO', label: 'Em desenvolvimento', desc: 'Site em construção' },
  { id: 'ENTREGUE',          label: 'Site entregue',       desc: 'Tarefas de manutenção activas' },
]

export default function EditarClientePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [form, setForm] = useState({
    empresa: '', contacto: '', email: '', telefone: '',
    plano: 'GROWTH' as Plano,
    faseSite: 'SEM_SITE' as FaseSite,
    mrr: 0,
    status: 'ONBOARDING' as ClienteStatus,
    driveUrl: '', canvaUrl: '', dominioUrl: '', whatsappUrl: '', instagram: '',
    notas: '',
  })
  const [servicos, setServicos] = useState<ServicoCliente[]>([])
  const [planosConfig, setPlanosConfig] = useState<PlanoConfig[]>([])
  const [servicosConfig, setServicosConfig] = useState<Servico[]>([])

  useEffect(() => {
    async function load() {
      const [cliente, planos, servicosDisponiveis] = await Promise.all([
        clientesService.getById(id), planosService.getAll(), servicosService.getAll(),
      ])
      setPlanosConfig(planos)
      setServicosConfig(servicosDisponiveis)
      if (!cliente) { setNaoEncontrado(true); setCarregando(false); return }
      setForm({
        empresa: cliente.empresa || '', contacto: cliente.contacto || '',
        email: cliente.email || '', telefone: cliente.telefone || '',
        plano: cliente.plano, faseSite: (cliente.faseSite as FaseSite) || 'SEM_SITE',
        mrr: cliente.mrr || 0, status: cliente.status,
        driveUrl: cliente.driveUrl || '', canvaUrl: cliente.canvaUrl || '',
        dominioUrl: cliente.dominioUrl || '', whatsappUrl: cliente.whatsappUrl || '',
        instagram: cliente.instagram || '', notas: cliente.notas || '',
      })
      setServicos(cliente.servicos && cliente.servicos.length ? cliente.servicos : SERVICOS_BASE[cliente.plano])
      setCarregando(false)
    }
    load()
  }, [id])

  function onPlanoChange(plano: PlanoConfig) {
    const novoPlano = asPlano(plano.nome)
    const servicosDoPlano: ServicoCliente[] = servicosConfig
      .filter(s => plano.servicoIds.includes(s.id!))
      .map(s => ({ id: s.id!, nome: s.nome, ativo: true, frequencia: 'MENSAL', quantidade: 1, unidade: 'serviço' }))
    setForm(f => ({ ...f, plano: novoPlano, faseSite: novoPlano === 'ONE' ? 'SEM_SITE' : f.faseSite }))
    setServicos(servicosDoPlano.length ? servicosDoPlano : SERVICOS_BASE[novoPlano])
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

  function removeServico(servicoId: string) {
    setServicos(s => s.filter(x => x.id !== servicoId))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.empresa) return
    setLoading(true)
    try {
      await clientesService.update(id, { ...form, servicos })
      router.push(`/clientes/${id}`)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const temSite = form.plano !== 'ONE'

  if (carregando) return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (naoEncontrado) return <div className="flex h-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>Cliente não encontrado</div>

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <button onClick={() => router.back()} className="btn btn-ghost py-1 px-2"><ArrowLeft size={14} /></button>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Editar cliente — {form.empresa}</div>
      </div>

      <form onSubmit={onSubmit} className="flex-1 overflow-auto p-5">
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Dados básicos */}
          <div className="card p-5">
            <div className="sec-title">Dados básicos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Empresa *</label>
                <input className="input" value={form.empresa} onChange={e => setForm(f => ({...f, empresa: e.target.value}))} required placeholder="Nome da empresa" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Contacto</label>
                <input className="input" value={form.contacto} onChange={e => setForm(f => ({...f, contacto: e.target.value}))} placeholder="Nome do contacto" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@empresa.pt" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Telefone</label>
                <input className="input" value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} placeholder="+351 9xx xxx xxx" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Instagram</label>
                <input className="input" value={form.instagram} onChange={e => setForm(f => ({...f, instagram: e.target.value}))} placeholder="@handle" />
              </div>
            </div>
          </div>

          {/* Plano */}
          <div className="card p-5">
            <div className="sec-title">Plano</div>
            {planosConfig.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '8px 0 16px' }}>Sem planos configurados — cria planos em Configurações.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {planosConfig.map(p => (
                  <button
                    key={p.id} type="button"
                    onClick={() => onPlanoChange(p)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      border: asPlano(p.nome) === form.plano ? '2px solid var(--brand)' : '1px solid var(--border-subtle)',
                      backgroundColor: asPlano(p.nome) === form.plano ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--bg-input)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>🌊 {p.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.descricao || `${p.servicoNomes.length} serviço(s)`}</div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                  MRR — Valor mensal (€)
                </label>
                <input className="input" type="number" value={form.mrr} onChange={e => setForm(f => ({...f, mrr: Number(e.target.value)}))} placeholder="0" />
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>Quanto o cliente paga por mês</div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Estado</label>
                <select className="select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as ClienteStatus}))}>
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="PAUSADO">Pausado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fase do site — só aparece se o plano tem site */}
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
                    onClick={() => setForm(x => ({...x, faseSite: f.id}))}
                    style={{
                      padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      border: form.faseSite === f.id ? '2px solid var(--brand)' : '1px solid var(--border-subtle)',
                      backgroundColor: form.faseSite === f.id ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--bg-input)',
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
                {form.faseSite === 'SEM_SITE' && 'As tarefas mensais não incluem manutenção de site. Quando o site for entregue, altera para "Site entregue".'}
                {form.faseSite === 'EM_DESENVOLVIMENTO' && 'O projecto de criação do site está activo. As tarefas mensais não incluem manutenção ainda.'}
                {form.faseSite === 'ENTREGUE' && 'O site foi entregue. As tarefas mensais incluem manutenção, backups, SEO e actualizações.'}
              </div>
            </div>
          )}

          {/* Serviços */}
          <div className="card p-5">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="sec-title" style={{ marginBottom: 0 }}>Serviços & frequências</div>
              <button type="button" onClick={addServico} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
                <Plus size={11} /> Adicionar
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {servicos.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <input
                    type="checkbox" checked={s.ativo}
                    onChange={e => updateServico(s.id, 'ativo', e.target.checked)}
                    style={{ width: 14, height: 14, flexShrink: 0, accentColor: 'var(--brand)', cursor: 'pointer' }}
                  />
                  <input
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-secondary)' }}
                    value={s.nome} onChange={e => updateServico(s.id, 'nome', e.target.value)}
                    placeholder="Nome do serviço"
                  />
                  <input
                    type="number"
                    style={{ width: 36, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}
                    value={s.quantidade} onChange={e => updateServico(s.id, 'quantidade', Number(e.target.value))}
                  />
                  <input
                    style={{ width: 56, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-faint)' }}
                    value={s.unidade} onChange={e => updateServico(s.id, 'unidade', e.target.value)}
                    placeholder="unidade"
                  />
                  <select
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer' }}
                    value={s.frequencia} onChange={e => updateServico(s.id, 'frequencia', e.target.value)}
                  >
                    {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button type="button" onClick={() => removeServico(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {!servicos.length && (
                <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '12px 0' }}>Sem serviços configurados</div>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="card p-5">
            <div className="sec-title">Links</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'driveUrl',    label: 'Google Drive' },
                { key: 'canvaUrl',    label: 'Canva' },
                { key: 'dominioUrl',  label: 'Domínio / Site' },
                { key: 'whatsappUrl', label: 'Grupo WhatsApp' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{label}</label>
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
            <label style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Notas internas</label>
            <textarea
              className="input" rows={3}
              value={form.notas} onChange={e => setForm(f => ({...f, notas: e.target.value}))}
              placeholder="Notas sobre este cliente..."
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => router.back()} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Guardar alterações
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}
