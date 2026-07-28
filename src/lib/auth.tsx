'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from './firebase'
import { usuariosService, type Usuario } from './db'

interface AuthContextValue {
  user: User | null
  perfil: Usuario | null
  loading: boolean
  logout: () => Promise<void>
  refreshPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null, perfil: null, loading: true, logout: async () => {}, refreshPerfil: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // Sem isto, uma mudança de sessão (ex: login) deixava "loading" em false
      // (valor da verificação inicial) enquanto o perfil ainda estava a ser
      // pedido ao Firestore — nessa janela o AuthGate mostrava "Perfil não
      // encontrado" por engano, em vez do spinner de carregamento.
      setLoading(true)
      setUser(u)
      try {
        setPerfil(u ? await usuariosService.getById(u.uid) : null)
      } catch (e) {
        console.error(e)
        setPerfil(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function logout() {
    await signOut(auth)
  }

  // Força um novo pedido do perfil ao Firestore. Necessário logo após o registo,
  // porque o onAuthStateChanged já pode ter tentado ler o perfil antes de o
  // documento em usuarios/{uid} chegar a ser criado.
  async function refreshPerfil() {
    if (!auth.currentUser) return
    try {
      setPerfil(await usuariosService.getById(auth.currentUser.uid))
    } catch (e) { console.error(e) }
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, logout, refreshPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
