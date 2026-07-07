import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, where,
  serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LeadStatus = 'NOVO' | 'QUALIFICACAO' | 'AUDITORIA' | 'REUNIAO' | 'PROPOSTA' | 'FECHADO' | 'PERDIDO'
export type Plano = 'ONE' | 'PRESENCE' | 'GROWTH'
export type PropostaStatus = 'PREPARACAO' | 'ENVIADA' | 'NEGOCIACAO' | 'ACEITE' | 'RECUSADA'
export type ProjectStatus = 'PLANEAMENTO' | 'EXECUCAO' | 'APROVACAO' | 'ENTREGA' | 'CONCLUIDO'
export type ClienteStatus = 'ONBOARDING' | 'ATIVO' | 'PAUSADO' | 'CANCELADO'
export type EstadoPagamento = 'PAGO' | 'AGUARDA' | 'ATRASO' | 'CANCELADO'

export interface Lead {
  id?: string
  empresa: string
  contacto?: string
  email?: string
  telefone?: string
  website?: string
  instagram?: string
  origem?: string
  status: LeadStatus
  planoRec?: Plano
  score?: number
  proximaAcao?: string
  notas?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Cliente {
  id?: string
  empresa: string
  contacto?: string
  email?: string
  telefone?: string
  plano: Plano
  mrr: number
  status: ClienteStatus
  driveUrl?: string
  canvaUrl?: string
  dominioUrl?: string
  whatsappUrl?: string
  notas?: string
  createdAt?: Timestamp
}

export interface Projeto {
  id?: string
  clienteId: string
  clienteNome?: string
  nome: string
  tipo: string
  status: ProjectStatus
  progresso: number
  dataEntrega?: string
  notas?: string
  createdAt?: Timestamp
}

export interface Receita {
  id?: string
  clienteId: string
  clienteNome?: string
  descricao: string
  tipo: string
  valor: number
  data: string
  estado: EstadoPagamento
  recorrente: boolean
  notas?: string
  createdAt?: Timestamp
}

export interface Despesa {
  id?: string
  descricao: string
  categoria: string
  valor: number
  data: string
  estado: EstadoPagamento
  recorrente: boolean
  notas?: string
  createdAt?: Timestamp
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanData(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  )
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leadsService = {
  async getAll(): Promise<Lead[]> {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead))
  },

  async getById(id: string): Promise<Lead | null> {
    const snap = await getDoc(doc(db, 'leads', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Lead : null
  },

  async create(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'leads'), {
      ...cleanData(data as Record<string, unknown>),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  },

  async update(id: string, data: Partial<Lead>): Promise<void> {
    await updateDoc(doc(db, 'leads', id), {
      ...cleanData(data as Record<string, unknown>),
      updatedAt: serverTimestamp(),
    })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'leads', id))
  },
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export const clientesService = {
  async getAll(): Promise<Cliente[]> {
    const q = query(collection(db, 'clientes'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente))
  },

  async getById(id: string): Promise<Cliente | null> {
    const snap = await getDoc(doc(db, 'clientes', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Cliente : null
  },

  async create(data: Omit<Cliente, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'clientes'), {
      ...cleanData(data as Record<string, unknown>),
      createdAt: serverTimestamp(),
    })
    return ref.id
  },

  async update(id: string, data: Partial<Cliente>): Promise<void> {
    await updateDoc(doc(db, 'clientes', id), cleanData(data as Record<string, unknown>))
  },
}

// ─── Projetos ─────────────────────────────────────────────────────────────────

export const projetosService = {
  async getAll(): Promise<Projeto[]> {
    const q = query(collection(db, 'projetos'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Projeto))
  },

  async getByCliente(clienteId: string): Promise<Projeto[]> {
    const q = query(collection(db, 'projetos'), where('clienteId', '==', clienteId))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Projeto))
  },

  async create(data: Omit<Projeto, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'projetos'), {
      ...cleanData(data as Record<string, unknown>),
      createdAt: serverTimestamp(),
    })
    return ref.id
  },

  async update(id: string, data: Partial<Projeto>): Promise<void> {
    await updateDoc(doc(db, 'projetos', id), cleanData(data as Record<string, unknown>))
  },
}

// ─── Financeiro ───────────────────────────────────────────────────────────────

export const financeiroService = {
  async getReceitas(mes?: number, ano?: number): Promise<Receita[]> {
    const q = query(collection(db, 'receitas'), orderBy('data', 'desc'))
    const snap = await getDocs(q)
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Receita))

    if (mes && ano) {
      const prefix = `${ano}-${String(mes).padStart(2, '0')}`
      results = results.filter(r => r.data.startsWith(prefix))
    }
    return results
  },

  async getDespesas(mes?: number, ano?: number): Promise<Despesa[]> {
    const q = query(collection(db, 'despesas'), orderBy('data', 'desc'))
    const snap = await getDocs(q)
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Despesa))

    if (mes && ano) {
      const prefix = `${ano}-${String(mes).padStart(2, '0')}`
      results = results.filter(d => d.data.startsWith(prefix))
    }
    return results
  },

  async createReceita(data: Omit<Receita, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'receitas'), {
      ...data, createdAt: serverTimestamp(),
    })
    return ref.id
  },

  async createDespesa(data: Omit<Despesa, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'despesas'), {
      ...data, createdAt: serverTimestamp(),
    })
    return ref.id
  },

  async getMRR(): Promise<number> {
    const q = query(collection(db, 'receitas'), where('recorrente', '==', true))
    const snap = await getDocs(q)
    return snap.docs.reduce((sum, d) => sum + (d.data().valor || 0), 0)
  },
}
