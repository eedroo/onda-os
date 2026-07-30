'use client'

import { useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase'

const labelStyle: CSSProperties = { fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [enviandoReset, setEnviandoReset] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setMensagem(null)
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/')
    } catch (err) {
      console.error(err)
      setErro('Email ou palavra-passe incorretos.')
    } finally {
      setLoading(false)
    }
  }

  async function onEsqueciPassword() {
    setErro(null)
    setMensagem(null)
    if (!email.trim()) { setErro('Escreve o teu email no campo acima e depois clica em "Esqueci a palavra-passe".'); return }
    setEnviandoReset(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setMensagem('Enviámos um email para repores a palavra-passe. Verifica a caixa de entrada (e o spam).')
    } catch (err) {
      console.error(err)
      setErro('Não foi possível enviar o email. Confirma que o endereço está correto.')
    } finally {
      setEnviandoReset(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
      <form onSubmit={onSubmit} className="card" style={{ padding: 28, width: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 auto 10px' }}>O</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Onda OS</div>
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Palavra-passe</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="button" onClick={onEsqueciPassword} disabled={enviandoReset}
            style={{ background: 'none', border: 'none', padding: 0, marginTop: 6, fontSize: 11, color: 'var(--accent-blue)', cursor: 'pointer' }}>
            {enviandoReset ? 'A enviar...' : 'Esqueci a palavra-passe'}
          </button>
        </div>
        {erro && <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>{erro}</div>}
        {mensagem && <div style={{ fontSize: 12, color: 'var(--accent-green)' }}>{mensagem}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ justifyContent: 'center' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : null} Entrar
        </button>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Não tens conta? <Link href="/registar" style={{ color: 'var(--accent-blue)' }}>Criar conta</Link>
        </div>
      </form>
    </div>
  )
}
