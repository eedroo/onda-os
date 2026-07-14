import {
  collection, doc, addDoc, updateDoc, getDoc,
  getDocs, serverTimestamp, Timestamp, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

export type Plano = 'ONE' | 'PRESENCE' | 'GROWTH'
export type ClienteStatus = 'ONBOARDING' | 'ATIVO' | 'PAUSADO' | 'CANCELADO'
export type ProjectStatus = 'PLANEAMENTO' | 'EXECUCAO' | 'APROVACAO' | 'ENTREGA' | 'CONCLUIDO'
export type TarefaStatus = 'PENDENTE' | 'EM_CURSO' | 'CONCLUIDA' | 'BLOQUEADA'
export type Frequencia = 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'PONTUAL'
export type EstadoPagamento = 'PAGO' | 'AGUARDA' | 'ATRASO' | 'CANCELADO'

export interface ServicoCliente {
  id: string; nome: string; ativo: boolean
  frequencia: Frequencia; quantidade: number; unidade: string; notas?: string
}

export interface Cliente {
  id?: string; empresa: string; contacto?: string; email?: string; telefone?: string
  plano: Plano; mrr: number; status: ClienteStatus; clienteDesde?: string; renovacao?: string
  driveUrl?: string; canvaUrl?: string; dominioUrl?: string; whatsappUrl?: string
  instagram?: string; faseSite?: string; servicos: ServicoCliente[]; notas?: string; createdAt?: Timestamp
}

export interface Projeto {
  id?: string; clienteId: string; clienteNome: string; clientePlano: Plano
  nome: string; mes: number; ano: number; status: ProjectStatus; progresso: number
  notas?: string; createdAt?: Timestamp
}

export interface Tarefa {
  id?: string; projetoId: string; clienteId: string; titulo: string; descricao?: string
  status: TarefaStatus; ordem: number; categoria: string; frequencia?: Frequencia
  dataLimite?: string; concluidaEm?: string; createdAt?: Timestamp
}

export interface Receita {
  id?: string; clienteId: string; clienteNome?: string; descricao: string; tipo: string
  valor: number; data: string; estado: EstadoPagamento; recorrente: boolean; notas?: string; createdAt?: Timestamp
}

export interface Despesa {
  id?: string; descricao: string; categoria: string; valor: number; data: string
  estado: EstadoPagamento; recorrente: boolean; notas?: string; createdAt?: Timestamp
}

export const TAREFAS_ONE = [
  { titulo: 'Publicações Google Business',  categoria: 'Google Business', status: 'PENDENTE' as TarefaStatus, ordem: 1 },
  { titulo: 'Atualização de informações',   categoria: 'Google Business', status: 'PENDENTE' as TarefaStatus, ordem: 2 },
  { titulo: 'Responder avaliações',         categoria: 'Google Business', status: 'PENDENTE' as TarefaStatus, ordem: 3 },
  { titulo: 'SEO local — análise',          categoria: 'SEO',             status: 'PENDENTE' as TarefaStatus, ordem: 4 },
  { titulo: 'Melhorias na ficha Google',    categoria: 'Google Business', status: 'PENDENTE' as TarefaStatus, ordem: 5 },
  { titulo: 'Relatório mensal',             categoria: 'Relatório',       status: 'PENDENTE' as TarefaStatus, ordem: 6 },
  { titulo: 'Enviar relatório ao cliente',  categoria: 'Relatório',       status: 'PENDENTE' as TarefaStatus, ordem: 7 },
]

export const TAREFAS_PRESENCE = [
  ...TAREFAS_ONE,
  { titulo: 'Manutenção do site',           categoria: 'Site', status: 'PENDENTE' as TarefaStatus, ordem: 8 },
  { titulo: 'Backup do site',               categoria: 'Site', status: 'PENDENTE' as TarefaStatus, ordem: 9 },
  { titulo: 'Verificar velocidade',         categoria: 'Site', status: 'PENDENTE' as TarefaStatus, ordem: 10 },
  { titulo: 'SEO on-page — revisão',        categoria: 'SEO',  status: 'PENDENTE' as TarefaStatus, ordem: 11 },
  { titulo: 'Alterações solicitadas',       categoria: 'Site', status: 'PENDENTE' as TarefaStatus, ordem: 12 },
]

export const TAREFAS_GROWTH = [
  ...TAREFAS_PRESENCE,
  { titulo: 'Estratégia do mês',            categoria: 'Estratégia', status: 'PENDENTE' as TarefaStatus, ordem: 13 },
  { titulo: 'Artigo de blog #1',            categoria: 'Blog',       status: 'PENDENTE' as TarefaStatus, ordem: 14 },
  { titulo: 'Artigo de blog #2',            categoria: 'Blog',       status: 'PENDENTE' as TarefaStatus, ordem: 15 },
  { titulo: 'Artigo de blog #3',            categoria: 'Blog',       status: 'PENDENTE' as TarefaStatus, ordem: 16 },
  { titulo: 'Artigo de blog #4',            categoria: 'Blog',       status: 'PENDENTE' as TarefaStatus, ordem: 17 },
  { titulo: 'Análise de métricas — site',   categoria: 'SEO',        status: 'PENDENTE' as TarefaStatus, ordem: 18 },
  { titulo: 'Análise de palavras-chave',    categoria: 'SEO',        status: 'PENDENTE' as TarefaStatus, ordem: 19 },
  { titulo: 'Acompanhamento estratégico',   categoria: 'Estratégia', status: 'PENDENTE' as TarefaStatus, ordem: 20 },
  { titulo: 'Relatório avançado',           categoria: 'Relatório',  status: 'PENDENTE' as TarefaStatus, ordem: 21 },
]

export function getTarefasPorPlano(plano: Plano) {
  if (plano === 'ONE') return TAREFAS_ONE
  if (plano === 'PRESENCE') return TAREFAS_PRESENCE
  return TAREFAS_GROWTH
}

export const SERVICOS_BASE: Record<Plano, ServicoCliente[]> = {
  ONE: [
    { id: 'google-posts',   nome: 'Publicações Google Business', ativo: true, frequencia: 'SEMANAL', quantidade: 4, unidade: 'posts' },
    { id: 'google-reviews', nome: 'Gestão de avaliações',        ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'revisão' },
    { id: 'seo-local',      nome: 'SEO Local',                   ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'análise' },
    { id: 'relatorio',      nome: 'Relatório mensal',            ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'relatório' },
  ],
  PRESENCE: [
    { id: 'google-posts',    nome: 'Publicações Google Business', ativo: true, frequencia: 'SEMANAL', quantidade: 4, unidade: 'posts' },
    { id: 'google-reviews',  nome: 'Gestão de avaliações',        ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'revisão' },
    { id: 'seo-local',       nome: 'SEO Local',                   ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'análise' },
    { id: 'site-manutencao', nome: 'Manutenção do site',          ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'revisão' },
    { id: 'site-seo',        nome: 'SEO on-page',                 ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'análise' },
    { id: 'relatorio',       nome: 'Relatório mensal',            ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'relatório' },
  ],
  GROWTH: [
    { id: 'google-posts',    nome: 'Publicações Google Business', ativo: true, frequencia: 'SEMANAL', quantidade: 4, unidade: 'posts' },
    { id: 'google-reviews',  nome: 'Gestão de avaliações',        ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'revisão' },
    { id: 'seo-local',       nome: 'SEO Local',                   ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'análise' },
    { id: 'site-manutencao', nome: 'Manutenção do site',          ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'revisão' },
    { id: 'site-seo',        nome: 'SEO on-page',                 ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'análise' },
    { id: 'blog',            nome: 'Artigos de blog',             ativo: true, frequencia: 'MENSAL',  quantidade: 4, unidade: 'artigos' },
    { id: 'estrategia',      nome: 'Estratégia mensal',           ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'sessão' },
    { id: 'metricas',        nome: 'Análise de métricas',         ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'análise' },
    { id: 'relatorio-av',    nome: 'Relatório avançado',          ativo: true, frequencia: 'MENSAL',  quantidade: 1, unidade: 'relatório' },
  ],
}

// ─── Clientes ─────────────────────────────────────────────────────────────────
export const clientesService = {
  async getAll(): Promise<Cliente[]> {
    const snap = await getDocs(collection(db, 'clientes'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente))
  },
  async getById(id: string): Promise<Cliente | null> {
    const snap = await getDoc(doc(db, 'clientes', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Cliente : null
  },
  async create(data: Omit<Cliente, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'clientes'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async update(id: string, data: Partial<Cliente>): Promise<void> {
    await updateDoc(doc(db, 'clientes', id), data as Record<string, unknown>)
  },
}

// ─── Projetos ─────────────────────────────────────────────────────────────────
export const projetosService = {
  async getAll(): Promise<Projeto[]> {
    const snap = await getDocs(collection(db, 'projetos'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Projeto))
  },
  async getByCliente(clienteId: string): Promise<Projeto[]> {
    const snap = await getDocs(collection(db, 'projetos'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Projeto)).filter(p => p.clienteId === clienteId)
  },
  async criarMensal(cliente: Cliente, mes: number, ano: number): Promise<string> {
    const nomeMes = new Date(ano, mes - 1).toLocaleString('pt-PT', { month: 'long' })
    const projetoRef = await addDoc(collection(db, 'projetos'), {
      clienteId: cliente.id, clienteNome: cliente.empresa, clientePlano: cliente.plano,
      nome: `${cliente.empresa} — ${nomeMes} ${ano}`,
      mes, ano, status: 'EXECUCAO', progresso: 0, createdAt: serverTimestamp(),
    })
    const batch = writeBatch(db)
    getTarefasPorPlano(cliente.plano).forEach(t => {
      batch.set(doc(collection(db, 'tarefas')), { ...t, projetoId: projetoRef.id, clienteId: cliente.id, createdAt: serverTimestamp() })
    })
    await batch.commit()
    return projetoRef.id
  },
  async update(id: string, data: Partial<Projeto>): Promise<void> {
    await updateDoc(doc(db, 'projetos', id), data as Record<string, unknown>)
  },
}

// ─── Tarefas ──────────────────────────────────────────────────────────────────
export const tarefasService = {
  async getByProjeto(projetoId: string): Promise<Tarefa[]> {
    const snap = await getDocs(collection(db, 'tarefas'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tarefa))
      .filter(t => t.projetoId === projetoId)
      .sort((a, b) => a.ordem - b.ordem)
  },
  async getById(id: string): Promise<Tarefa | null> {
    const snap = await getDoc(doc(db, 'tarefas', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Tarefa : null
  },
  // Busca TODAS as tarefas dos clientes (incluindo concluídas)
  async getByClientes(clienteIds: string[]): Promise<Tarefa[]> {
    const snap = await getDocs(collection(db, 'tarefas'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tarefa))
      .filter(t => clienteIds.includes(t.clienteId))
  },
  async getPendentes(clienteIds: string[]): Promise<Tarefa[]> {
    const snap = await getDocs(collection(db, 'tarefas'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tarefa))
      .filter(t => clienteIds.includes(t.clienteId) && t.status !== 'CONCLUIDA')
  },
  async update(id: string, data: Partial<Tarefa>): Promise<void> {
    await updateDoc(doc(db, 'tarefas', id), data as Record<string, unknown>)
  },
}

// ─── Financeiro ───────────────────────────────────────────────────────────────
export const financeiroService = {
  async getReceitas(mes?: number, ano?: number): Promise<Receita[]> {
    const snap = await getDocs(collection(db, 'receitas'))
    let r = snap.docs.map(d => ({ id: d.id, ...d.data() } as Receita))
    if (mes && ano) { const p = `${ano}-${String(mes).padStart(2,'0')}`; r = r.filter(x => x.data?.startsWith(p)) }
    return r.sort((a, b) => b.data.localeCompare(a.data))
  },
  async getDespesas(mes?: number, ano?: number): Promise<Despesa[]> {
    const snap = await getDocs(collection(db, 'despesas'))
    let r = snap.docs.map(d => ({ id: d.id, ...d.data() } as Despesa))
    if (mes && ano) { const p = `${ano}-${String(mes).padStart(2,'0')}`; r = r.filter(x => x.data?.startsWith(p)) }
    return r.sort((a, b) => b.data.localeCompare(a.data))
  },
  async createReceita(data: Omit<Receita, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'receitas'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async createDespesa(data: Omit<Despesa, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'despesas'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async getMRR(): Promise<number> {
    const snap = await getDocs(collection(db, 'receitas'))
    return snap.docs.filter(d => d.data().recorrente).reduce((s, d) => s + (d.data().valor || 0), 0)
  },
}
