'use client'

import { useEffect, useState } from 'react'
import { UserCog, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { usuariosService, type Usuario, type PerfilRole } from '@/lib/db'

const ROLE_LABEL: Record<PerfilRole, string> = { ADMIN: 'Admin', MEMBRO: 'Membro', PENDENTE: 'Pendente' }
const ROLE_COLOR: Record<PerfilRole, string> = { ADMIN: 'pill-purple', MEMBRO: 'pill-blue', PENDENTE: 'pill-amber' }

export default function UtilizadoresPage() {
  const { perfil, user } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setUsuarios(await usuariosService.getAll()) } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function mudarRole(uid: string, role: PerfilRole) {
    await usuariosService.update(uid, { role })
    setUsuarios(u => u.map(x => x.id === uid ? { ...x, role } : x))
  }

  if (perfil?.role !== 'ADMIN') {
    return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sem permissão para ver esta página</div>
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0, fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
        <UserCog size={18} style={{ color: 'var(--accent-blue)' }} /> Utilizadores
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usuarios.map(u => (
            <div key={u.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {u.nome} {u.id === user?.uid && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>(tu)</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span className={`pill ${ROLE_COLOR[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                <select className="select" style={{ width: 130 }} value={u.role} onChange={e => mudarRole(u.id!, e.target.value as PerfilRole)}>
                  <option value="PENDENTE">Pendente</option>
                  <option value="MEMBRO">Membro</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
          ))}
          {usuarios.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Sem utilizadores</div>}
        </div>
      </div>
    </div>
  )
}
