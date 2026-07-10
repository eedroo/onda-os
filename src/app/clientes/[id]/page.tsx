'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ExternalLink, Kanban, Plus, Edit } from 'lucide-react'
import Link from 'next/link'
import { clientesService, projetosService, type Cliente, type Projeto } from '@/lib/db'

const PLANO_COLOR: Record<string, string> = { ONE: 'pill-green', PRESENCE: 'pill-purple', GROWTH: 'pill-blue' }
const STATUS_COLOR: Record<string, string> = {
  ATIVO: 'var(--accent-green)', ONBOARDING: 'var(--accent-amber)',
  PAUSADO: 'var(--text-muted)', CANCELADO: 'var(--accent-red)'
}

export default function ClientePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([
        clientesService.getById(id),
        projetosService.getByCliente(id),
      ])
      setCliente(c)
      setProjetos(p)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} /></div>
  if (!cliente) return <div className="flex h-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>Cliente não encontrado</div>

  const projetosAtivos = projetos.filter(p => p.status !== 'CONCLUIDO')
  const links = [
    { key: 'driveUrl', label: 'Drive', icon: '📁' },
    { key: 'canvaUrl', label: 'Canva', icon: '🎨' },
    { key: 'dominioUrl', label: 'Site', icon: '🌐' },
    { key: 'whatsappUrl', label: 'WhatsApp', icon: '💬' },
  ].filter(l => (cliente as unknown as Record<string, unknown>)[l.key])

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '4px 8px' }}><ArrowLeft size={14} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>
              {cliente.empresa.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{cliente.empresa}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{cliente.contacto}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/clientes/${id}/editar`} className="btn btn-ghost"><Edit size={13} /> Editar</Link>
          <Link href={`/projetos?cliente=${id}`} className="btn btn-primary"><Plus size={13} /> Novo projeto</Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-blue)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Plano</div>
              <span className={`pill ${PLANO_COLOR[cliente.plano]}`}>{cliente.plano}</span>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-green)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>MRR</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-green)' }}>{cliente.mrr}€</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-amber)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Projetos ativos</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent-amber)' }}>{projetosAtivos.length}</div>
            </div>
            <div className="card" style={{ padding: '12px 14px', borderTop: '2px solid var(--accent-purple)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Estado</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: STATUS_COLOR[cliente.status] }}>● {cliente.status}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Serviços */}
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Serviços activos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(cliente.servicos || []).filter(s => s.ativo).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.nome}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{s.quantidade} {s.unidade} / {s.frequencia.toLowerCase()}</span>
                  </div>
                ))}
                {!(cliente.servicos || []).filter(s => s.ativo).length && (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '12px 0' }}>Sem serviços configurados</div>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Links rápidos</div>
              {links.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {links.map(l => (
                    <a key={l.key} href={(cliente as unknown as Record<string, unknown>)[l.key] as string} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none', transition: 'border-color 0.15s', cursor: 'pointer' }}>
                      <span style={{ fontSize: 14 }}>{l.icon}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{l.label}</span>
                      <ExternalLink size={11} style={{ color: 'var(--text-faint)' }} />
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '12px 0' }}>Sem links adicionados</div>
              )}
              {cliente.instagram && (
                <a href={`https://instagram.com/${cliente.instagram.replace('@','')}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border-subtle)', textDecoration: 'none', marginTop: 6, cursor: 'pointer' }}>
                  <span style={{ fontSize: 14 }}>📸</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{cliente.instagram}</span>
                  <ExternalLink size={11} style={{ color: 'var(--text-faint)' }} />
                </a>
              )}
            </div>
          </div>

          {/* Projetos */}
          <div className="card" style={{ padding: 16 }}>
            <div className="sec-title"><Kanban size={12} /> Projetos</div>
            {projetos.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projetos.map(p => (
                  <Link key={p.id} href={`/projetos/${p.id}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', backgroundColor: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{p.nome}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.status}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.progresso}%`, backgroundColor: 'var(--brand)', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{p.progresso}%</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>Sem projetos ainda</div>
                <Link href="/projetos" className="btn btn-primary" style={{ fontSize: 11 }}>
                  <Plus size={12} /> Criar projeto do mês
                </Link>
              </div>
            )}
          </div>

          {/* Notas */}
          {cliente.notas && (
            <div className="card" style={{ padding: 16 }}>
              <div className="sec-title">Notas</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cliente.notas}</div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
