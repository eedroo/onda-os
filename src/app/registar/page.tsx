'use client'

import { useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { usuariosService } from '@/lib/db'

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

export default function RegistarPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (password.length < 6) { setErro('A palavra-passe precisa de ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: nome })
      // A primeira conta a ser criada torna-se Admin automaticamente; as seguintes ficam
      // Pendentes até um Admin as aprovar em Utilizadores.
      const existentes = await usuariosService.getAll()
      await usuariosService.criar(cred.user.uid, {
        email, nome, role: existentes.length === 0 ? 'ADMIN' : 'PENDENTE',
      })
      router.push('/')
    } catch (err) {
      console.error(err)
      setErro('Não foi possível criar a conta. Verifica o email e tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
      <form onSubmit={onSubmit} className="card" style={{ padding: 28, width: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 auto 10px' }}>O</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Criar conta</div>
        </div>
        <div>
          <label style={labelStyle}>Nome</label>
          <input className="input" value={nome} onChange={e => setNome(e.target.value)} required autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>Palavra-passe</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {erro && <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>{erro}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ justifyContent: 'center' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : null} Criar conta
        </button>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Já tens conta? <Link href="/login" style={{ color: 'var(--accent-blue)' }}>Entrar</Link>
        </div>
      </form>
    </div>
  )
}
