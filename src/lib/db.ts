import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc,
  getDocs, serverTimestamp, Timestamp, writeBatch, arrayUnion
} from 'firebase/firestore'
import { db } from './firebase'

export type Plano = 'ONE' | 'PRESENCE' | 'GROWTH'
export type ClienteStatus = 'ONBOARDING' | 'ATIVO' | 'PAUSADO' | 'CANCELADO'
export type ProjectStatus = 'PLANEAMENTO' | 'EXECUCAO' | 'APROVACAO' | 'ENTREGA' | 'CONCLUIDO'
export type TarefaStatus = 'PENDENTE' | 'EM_CURSO' | 'CONCLUIDA' | 'BLOQUEADA'
export type Frequencia = 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'PONTUAL'
export type EstadoPagamento = 'PAGO' | 'AGUARDA' | 'ATRASO' | 'CANCELADO'

// ─── Comercial ──────────────────────────────────────────────────────────────
export type LeadStatus = 'NOVO' | 'QUALIFICACAO' | 'AUDITORIA' | 'REUNIAO' | 'PROPOSTA' | 'FECHADO' | 'PERDIDO'
export type AuditoriaStatus = 'PENDENTE' | 'EM_CURSO' | 'CONCLUIDA' | 'ENVIADA'
export type ReuniaoTipo = 'ESTRATEGICA' | 'KICKOFF' | 'ACOMPANHAMENTO' | 'RENOVACAO' | 'FOLLOWUP'
export type ReuniaoStatus = 'AGENDADA' | 'REALIZADA' | 'CANCELADA'
export type PropostaStatus = 'PREPARACAO' | 'ENVIADA' | 'NEGOCIACAO' | 'ACEITE' | 'RECUSADA'
export type ContratoStatus = 'RASCUNHO' | 'ENVIADO' | 'ASSINADO' | 'CANCELADO'
export type Origem = 'INSTAGRAM' | 'LANDING' | 'INDICACAO' | 'COLD' | 'OUTRO'
export type PlanoRec = 'ONE' | 'PRESENCE' | 'GROWTH' | 'PERSONALIZADO'

export interface HistoricoLead { status: LeadStatus; data: string }

export interface Lead {
  id?: string
  empresa: string; contacto?: string; email?: string; telefone?: string
  website?: string; instagram?: string
  origem: Origem; status: LeadStatus; planoRec?: PlanoRec
  score?: number; proximaAcao?: string; notas?: string; valorPotencial?: number
  checklist?: string[]
  historico?: HistoricoLead[]
  createdAt?: Timestamp; updatedAt?: Timestamp
}

export interface Auditoria {
  id?: string; leadId: string; leadNome: string; status: AuditoriaStatus
  scoreGoogle?: number; scoreWebsite?: number; scoreSEO?: number; scoreRedes?: number; scoreConversao?: number
  diagnostico?: string; planoRecomendado?: PlanoRec; argumentoVenda?: string; proximoPasso?: string; notas?: string
  createdAt?: Timestamp
}

export interface Reuniao {
  id?: string; leadId?: string; clienteId?: string; nomeAssociado: string
  tipo: ReuniaoTipo; status: ReuniaoStatus; data: string; hora: string
  duracao?: number; formato?: string; linkMeet?: string
  objetivos?: string; dores?: string; oportunidades?: string; notas?: string
  planoSugerido?: PlanoRec; proximoPasso?: string; checklistPos?: string[]
  createdAt?: Timestamp
}

export interface Proposta {
  id?: string; leadId: string; leadNome: string; plano: PlanoRec; valor: number
  status: PropostaStatus; canvaUrl?: string; pdfUrl?: string; validadeAte?: string
  promptIA?: string; checklist?: string[]; proximoPasso?: string; notas?: string
  createdAt?: Timestamp; updatedAt?: Timestamp
}

export interface Contrato {
  id?: string; clienteId?: string; leadId?: string; nomeAssociado: string
  plano: PlanoRec; valor: number; status: ContratoStatus
  dataInicio?: string; dataFim?: string; documentoUrl?: string; notas?: string
  createdAt?: Timestamp
}

export interface ServicoCliente {
  id: string; nome: string; ativo: boolean
  frequencia: Frequencia; quantidade: number; unidade: string; notas?: string
}

// Tarefa do perfil de tarefas do cliente — gerada a partir dos serviços
// escolhidos na criação, mas depois independente do template do serviço:
// editar/remover aqui não afecta o serviço nem outros clientes.
export interface TarefaPerfilCliente {
  id: string
  titulo: string
  servicoId: string
  servicoNome: string
  categoriaId: string
  categoriaNome: string
  frequencia: Frequencia
  ordem: number
  notas?: string
}

export interface LinkFavorito {
  id: string
  label: string
  url: string
}

export interface Cliente {
  id?: string; empresa: string; contacto?: string; email?: string; telefone?: string
  plano: Plano; mrr: number; status: ClienteStatus; clienteDesde?: string; renovacao?: string
  driveUrl?: string; canvaUrl?: string; dominioUrl?: string; whatsappUrl?: string
  instagram?: string; faseSite?: string; servicos: ServicoCliente[]; notas?: string; createdAt?: Timestamp
  // Perfil de tarefas personalizado deste cliente. Quando presente, é usado
  // para gerar os projectos mensais em vez do template genérico do plano.
  tarefasPersonalizadas?: TarefaPerfilCliente[]
  // Links extra que o utilizador guarda para este cliente (além de Drive/Canva/site/WhatsApp),
  // e que também aparecem nos atalhos do cabeçalho dos projectos deste cliente.
  linksFavoritos?: LinkFavorito[]
}

export interface Projeto {
  id?: string; clienteId: string; clienteNome: string; clientePlano: Plano
  nome: string; mes: number; ano: number; status: ProjectStatus; progresso: number
  notas?: string; createdAt?: Timestamp
}

export type Prioridade = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE'

export interface Anexo { id: string; label: string; url: string }
export interface Subtarefa { id: string; titulo: string; concluida: boolean }
export interface HistoricoStatus { status: TarefaStatus; data: string }

export interface Tarefa {
  id?: string; projetoId: string; clienteId: string; titulo: string; descricao?: string
  status: TarefaStatus; ordem: number; categoria: string; frequencia?: Frequencia
  servicoId?: string; servicoNome?: string
  dataLimite?: string; dataInicio?: string; concluidaEm?: string
  progresso?: number; prioridade?: Prioridade
  anexos?: Anexo[]; subtarefas?: Subtarefa[]; historicoStatus?: HistoricoStatus[]
  createdAt?: Timestamp
}

export interface Receita {
  id?: string; clienteId: string; clienteNome?: string; descricao: string; tipo: string
  valor: number; data: string; estado: EstadoPagamento; recorrente: boolean
  metodoPagamento?: string; notas?: string; createdAt?: Timestamp
}

export interface Despesa {
  id?: string; descricao: string; categoria: string; valor: number; data: string
  estado: EstadoPagamento; recorrente: boolean
  metodoPagamento?: string; notas?: string; createdAt?: Timestamp
}

// ─── Configuração: categorias, serviços, planos ────────────────────────────────
export interface Categoria {
  id?: string
  nome: string
  descricao?: string
  createdAt?: Timestamp
}

export interface TarefaTemplate {
  id: string
  titulo: string
  categoriaId: string  // referência à colecção categorias
  categoriaNome: string  // desnormalizado para evitar joins
  frequencia: Frequencia
  ordem: number
  notas?: string
}

export interface Servico {
  id?: string
  nome: string
  descricao?: string
  tarefasTemplate: TarefaTemplate[]
  createdAt?: Timestamp
}

// Nota: chamado PlanoConfig (em vez de Plano) para não colidir com o tipo
// `Plano = 'ONE' | 'PRESENCE' | 'GROWTH'` já usado em Cliente.plano.
export interface PlanoConfig {
  id?: string
  nome: string           // ex: "ONE", "PRESENCE", "GROWTH"
  descricao?: string
  servicoIds: string[]   // IDs dos serviços incluídos neste plano
  servicoNomes: string[] // desnormalizado
  ordem: number          // ordem de exibição
  createdAt?: Timestamp
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

// Mapeia o nome de um PlanoConfig (configurável) para o tipo Plano fixo
// usado em Cliente.plano. Planos seed usam exactamente estes nomes; um
// nome de plano configurável fora deste conjunto cai em 'GROWTH'.
export function asPlano(nome: string): Plano {
  return nome === 'ONE' || nome === 'PRESENCE' || nome === 'GROWTH' ? nome : 'GROWTH'
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

// Achata as tarefasTemplate dos serviços escolhidos num perfil de tarefas
// editável do cliente. Renumera a ordem sequencialmente pela ordem dos
// serviços e, dentro de cada serviço, pela ordem original da tarefa.
export function tarefasDeServicos(servicosEscolhidos: Servico[]): TarefaPerfilCliente[] {
  const tarefas: TarefaPerfilCliente[] = []
  let ordem = 1
  for (const s of servicosEscolhidos) {
    const ordenadas = [...s.tarefasTemplate].sort((a, b) => a.ordem - b.ordem)
    for (const t of ordenadas) {
      tarefas.push({
        id: `perfil-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        titulo: t.titulo, servicoId: s.id!, servicoNome: s.nome,
        categoriaId: t.categoriaId, categoriaNome: t.categoriaNome,
        frequencia: t.frequencia, ordem: ordem++, notas: t.notas,
      })
    }
  }
  return tarefas
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
  async criarMensal(
    cliente: Cliente, mes: number, ano: number,
    tarefasOverride?: { titulo: string; categoria: string; frequencia?: Frequencia }[]
  ): Promise<string> {
    const nomeMes = new Date(ano, mes - 1).toLocaleString('pt-PT', { month: 'long' })
    const projetoRef = await addDoc(collection(db, 'projetos'), {
      clienteId: cliente.id, clienteNome: cliente.empresa, clientePlano: cliente.plano,
      nome: `${cliente.empresa} — ${nomeMes} ${ano}`,
      mes, ano, status: 'EXECUCAO', progresso: 0, createdAt: serverTimestamp(),
    })
    const batch = writeBatch(db)
    const tarefasBase = tarefasOverride
      ? tarefasOverride.map((t, i) => ({ titulo: t.titulo, categoria: t.categoria, status: 'PENDENTE' as TarefaStatus, ordem: i + 1, frequencia: t.frequencia }))
      : cliente.tarefasPersonalizadas && cliente.tarefasPersonalizadas.length > 0
      ? cliente.tarefasPersonalizadas.map(t => ({
          titulo: t.titulo, categoria: t.categoriaNome, status: 'PENDENTE' as TarefaStatus,
          ordem: t.ordem, frequencia: t.frequencia, servicoId: t.servicoId, servicoNome: t.servicoNome,
        }))
      : getTarefasPorPlano(cliente.plano)
    tarefasBase.forEach(t => {
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
  async create(data: Omit<Tarefa, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'tarefas'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
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
  async updateStatus(id: string, status: TarefaStatus): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      historicoStatus: arrayUnion({ status, data: new Date().toISOString() }),
    }
    if (status === 'CONCLUIDA') {
      updates.concluidaEm = new Date().toISOString()
    } else {
      updates.concluidaEm = null
    }
    await updateDoc(doc(db, 'tarefas', id), updates)
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'tarefas', id))
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
  async updateReceita(id: string, data: Partial<Receita>): Promise<void> {
    await updateDoc(doc(db, 'receitas', id), data as Record<string, unknown>)
  },
  async updateDespesa(id: string, data: Partial<Despesa>): Promise<void> {
    await updateDoc(doc(db, 'despesas', id), data as Record<string, unknown>)
  },
  async getMRR(): Promise<number> {
    const snap = await getDocs(collection(db, 'receitas'))
    return snap.docs.filter(d => d.data().recorrente).reduce((s, d) => s + (d.data().valor || 0), 0)
  },
}

// ─── Categorias ─────────────────────────────────────────────────────────────
export const categoriasService = {
  async getAll(): Promise<Categoria[]> {
    const snap = await getDocs(collection(db, 'categorias'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Categoria))
  },
  async getById(id: string): Promise<Categoria | null> {
    const snap = await getDoc(doc(db, 'categorias', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Categoria : null
  },
  async create(data: Omit<Categoria, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'categorias'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async update(id: string, data: Partial<Categoria>): Promise<void> {
    await updateDoc(doc(db, 'categorias', id), data as Record<string, unknown>)
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'categorias', id))
  },
}

// ─── Serviços ───────────────────────────────────────────────────────────────
export const servicosService = {
  async getAll(): Promise<Servico[]> {
    const snap = await getDocs(collection(db, 'servicos'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Servico))
  },
  async getById(id: string): Promise<Servico | null> {
    const snap = await getDoc(doc(db, 'servicos', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Servico : null
  },
  async create(data: Omit<Servico, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'servicos'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async update(id: string, data: Partial<Servico>): Promise<void> {
    await updateDoc(doc(db, 'servicos', id), data as Record<string, unknown>)
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'servicos', id))
  },
}

// ─── Planos (configuráveis) ──────────────────────────────────────────────────
export const planosService = {
  async getAll(): Promise<PlanoConfig[]> {
    const snap = await getDocs(collection(db, 'planos'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanoConfig)).sort((a, b) => a.ordem - b.ordem)
  },
  async getById(id: string): Promise<PlanoConfig | null> {
    const snap = await getDoc(doc(db, 'planos', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as PlanoConfig : null
  },
  async create(data: Omit<PlanoConfig, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'planos'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async update(id: string, data: Partial<PlanoConfig>): Promise<void> {
    await updateDoc(doc(db, 'planos', id), data as Record<string, unknown>)
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'planos', id))
  },
}

// ─── Seed de configuração inicial ────────────────────────────────────────────
function novaTarefaTemplate(
  titulo: string, categoriaId: string, categoriaNome: string, frequencia: Frequencia, ordem: number
): TarefaTemplate {
  return { id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, titulo, categoriaId, categoriaNome, frequencia, ordem }
}

export async function seedConfiguracoes(): Promise<void> {
  const categoriasExistentes = await categoriasService.getAll()
  if (categoriasExistentes.length > 0) return

  const nomesCategorias = ['Publicações', 'Avaliações', 'Optimização', 'SEO', 'Conteúdo', 'Site', 'Relatório', 'Estratégia', 'Administrativo']
  const categoriaIds: Record<string, string> = {}
  for (const nome of nomesCategorias) {
    categoriaIds[nome] = await categoriasService.create({ nome })
  }

  const servicosSeed: { nome: string; tarefas: [string, string, Frequencia][] }[] = [
    { nome: 'Google Business', tarefas: [
      ['Publicações Google', 'Publicações', 'SEMANAL'],
      ['Responder avaliações', 'Avaliações', 'MENSAL'],
      ['Actualização de informações', 'Optimização', 'MENSAL'],
      ['Melhorias na ficha', 'Optimização', 'MENSAL'],
    ]},
    { nome: 'SEO Local', tarefas: [
      ['Análise SEO local', 'SEO', 'MENSAL'],
      ['Pesquisa de palavras-chave', 'SEO', 'MENSAL'],
    ]},
    { nome: 'Site — Manutenção', tarefas: [
      ['Manutenção geral', 'Site', 'MENSAL'],
      ['Backup', 'Site', 'MENSAL'],
      ['Verificar velocidade', 'Site', 'MENSAL'],
      ['Alterações solicitadas', 'Site', 'MENSAL'],
      ['Verificar SSL', 'Site', 'MENSAL'],
    ]},
    { nome: 'SEO On-page', tarefas: [
      ['Revisão SEO on-page', 'SEO', 'MENSAL'],
      ['Análise de métricas', 'SEO', 'MENSAL'],
    ]},
    { nome: 'Blog', tarefas: [
      ['Artigo #1', 'Conteúdo', 'MENSAL'],
      ['Artigo #2', 'Conteúdo', 'MENSAL'],
      ['Artigo #3', 'Conteúdo', 'MENSAL'],
      ['Artigo #4', 'Conteúdo', 'MENSAL'],
    ]},
    { nome: 'Estratégia', tarefas: [
      ['Estratégia do mês', 'Estratégia', 'MENSAL'],
      ['Acompanhamento estratégico', 'Estratégia', 'MENSAL'],
    ]},
    { nome: 'Relatório', tarefas: [
      ['Relatório mensal', 'Relatório', 'MENSAL'],
      ['Enviar relatório ao cliente', 'Relatório', 'MENSAL'],
      ['Relatório avançado', 'Relatório', 'MENSAL'],
    ]},
  ]

  const servicoIds: Record<string, string> = {}
  for (const s of servicosSeed) {
    const tarefasTemplate = s.tarefas.map(([titulo, catNome, freq], i) =>
      novaTarefaTemplate(titulo, categoriaIds[catNome], catNome, freq, i + 1))
    servicoIds[s.nome] = await servicosService.create({ nome: s.nome, tarefasTemplate })
  }

  const planosSeed: { nome: string; descricao: string; servicos: string[]; ordem: number }[] = [
    { nome: 'ONE', descricao: 'Google Business + SEO Local', servicos: ['Google Business', 'SEO Local', 'Relatório'], ordem: 1 },
    { nome: 'PRESENCE', descricao: 'One + Landing Page', servicos: ['Google Business', 'SEO Local', 'Site — Manutenção', 'SEO On-page', 'Relatório'], ordem: 2 },
    { nome: 'GROWTH', descricao: 'Presence + Site completo + Blog', servicos: ['Google Business', 'SEO Local', 'Site — Manutenção', 'SEO On-page', 'Blog', 'Estratégia', 'Relatório'], ordem: 3 },
  ]

  for (const p of planosSeed) {
    await planosService.create({
      nome: p.nome,
      descricao: p.descricao,
      servicoIds: p.servicos.map(nome => servicoIds[nome]),
      servicoNomes: p.servicos,
      ordem: p.ordem,
    })
  }
}

// ─── Utilizadores (contas / perfis) ──────────────────────────────────────────
export type PerfilRole = 'ADMIN' | 'MEMBRO' | 'PENDENTE'

export interface Usuario {
  id?: string // = Firebase Auth UID
  email: string
  nome: string
  role: PerfilRole
  createdAt?: Timestamp
}

export const usuariosService = {
  async getAll(): Promise<Usuario[]> {
    const snap = await getDocs(collection(db, 'usuarios'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Usuario))
  },
  async getById(uid: string): Promise<Usuario | null> {
    const snap = await getDoc(doc(db, 'usuarios', uid))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Usuario : null
  },
  async criar(uid: string, data: Omit<Usuario, 'id' | 'createdAt'>): Promise<void> {
    await setDoc(doc(db, 'usuarios', uid), { ...data, createdAt: serverTimestamp() })
  },
  async update(uid: string, data: Partial<Usuario>): Promise<void> {
    await updateDoc(doc(db, 'usuarios', uid), data as Record<string, unknown>)
  },
}

// ─── Comercial: services ─────────────────────────────────────────────────────
export const leadsService = {
  async getAll(): Promise<Lead[]> {
    const snap = await getDocs(collection(db, 'leads'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead))
  },
  async getById(id: string): Promise<Lead | null> {
    const snap = await getDoc(doc(db, 'leads', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Lead : null
  },
  async create(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const agora = new Date().toISOString()
    const ref = await addDoc(collection(db, 'leads'), {
      ...data, createdAt: serverTimestamp(), updatedAt: agora,
      historico: [{ status: data.status, data: agora }],
    })
    return ref.id
  },
  async update(id: string, data: Partial<Lead>): Promise<void> {
    await updateDoc(doc(db, 'leads', id), { ...data, updatedAt: new Date().toISOString() } as Record<string, unknown>)
  },
  async updateStatus(id: string, status: LeadStatus): Promise<void> {
    const agora = new Date().toISOString()
    await updateDoc(doc(db, 'leads', id), {
      status, updatedAt: agora,
      historico: arrayUnion({ status, data: agora }),
    })
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'leads', id))
  },
}

export const auditoriasService = {
  async getAll(): Promise<Auditoria[]> {
    const snap = await getDocs(collection(db, 'auditorias'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Auditoria))
  },
  async getById(id: string): Promise<Auditoria | null> {
    const snap = await getDoc(doc(db, 'auditorias', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Auditoria : null
  },
  async getByLead(leadId: string): Promise<Auditoria[]> {
    const snap = await getDocs(collection(db, 'auditorias'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Auditoria)).filter(a => a.leadId === leadId)
  },
  async create(data: Omit<Auditoria, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'auditorias'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async update(id: string, data: Partial<Auditoria>): Promise<void> {
    await updateDoc(doc(db, 'auditorias', id), data as Record<string, unknown>)
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'auditorias', id))
  },
}

export const reunioesService = {
  async getAll(): Promise<Reuniao[]> {
    const snap = await getDocs(collection(db, 'reunioes'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Reuniao))
  },
  async getById(id: string): Promise<Reuniao | null> {
    const snap = await getDoc(doc(db, 'reunioes', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Reuniao : null
  },
  async getByLead(leadId: string): Promise<Reuniao[]> {
    const snap = await getDocs(collection(db, 'reunioes'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Reuniao)).filter(r => r.leadId === leadId)
  },
  async create(data: Omit<Reuniao, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'reunioes'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async update(id: string, data: Partial<Reuniao>): Promise<void> {
    await updateDoc(doc(db, 'reunioes', id), data as Record<string, unknown>)
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'reunioes', id))
  },
}

export const propostasService = {
  async getAll(): Promise<Proposta[]> {
    const snap = await getDocs(collection(db, 'propostas'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposta))
  },
  async getById(id: string): Promise<Proposta | null> {
    const snap = await getDoc(doc(db, 'propostas', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Proposta : null
  },
  async getByLead(leadId: string): Promise<Proposta[]> {
    const snap = await getDocs(collection(db, 'propostas'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposta)).filter(p => p.leadId === leadId)
  },
  async create(data: Omit<Proposta, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'propostas'), { ...data, createdAt: serverTimestamp(), updatedAt: new Date().toISOString() })
    return ref.id
  },
  async update(id: string, data: Partial<Proposta>): Promise<void> {
    await updateDoc(doc(db, 'propostas', id), { ...data, updatedAt: new Date().toISOString() } as Record<string, unknown>)
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'propostas', id))
  },
}

export const contratosService = {
  async getAll(): Promise<Contrato[]> {
    const snap = await getDocs(collection(db, 'contratos'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Contrato))
  },
  async getById(id: string): Promise<Contrato | null> {
    const snap = await getDoc(doc(db, 'contratos', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } as Contrato : null
  },
  async create(data: Omit<Contrato, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'contratos'), { ...data, createdAt: serverTimestamp() })
    return ref.id
  },
  async update(id: string, data: Partial<Contrato>): Promise<void> {
    await updateDoc(doc(db, 'contratos', id), data as Record<string, unknown>)
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'contratos', id))
  },
}
