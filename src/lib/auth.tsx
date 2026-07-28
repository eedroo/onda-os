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
}

const AuthContext = createContext<AuthContextValue>({
  user: null, perfil: null, loading: true, logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
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

  return (
    <AuthContext.Provider value={{ user, perfil, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
