import { getAdminDb } from './firebaseAdmin'
import { gerarComGemini } from './gemini'
import { enviarPushParaTodos } from './pushServer'

type RelatorioTipo = 'diario' | 'semanal' | 'mensal'

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function diasEntre(dataISO: string, ate: Date = new Date()): number {
  const d = new Date(dataISO)
  if (isNaN(d.getTime())) return 0
  return Math.floor((ate.getTime() - d.getTime()) / 86400000)
}

async function fetchColecao<T>(nome: string): Promise<(T & { id: string })[]> {
  const db = getAdminDb()
  const snap = await db.collection(nome).get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T & { id: string }))
}

// ─── Tipos mínimos dos documentos lidos (apenas os campos usados aqui) ──────
interface ProjetoDoc { clienteId: string; clienteNome: string; nome: string; mes: number; ano: number; status: string }
interface TarefaDoc { clienteId: string; titulo: string; status: string; categoria: string; dataLimite?: string; concluidaEm?: string }
interface ClienteDoc { empresa: string; status: string }
interface LeadDoc { empresa: string; status: string; updatedAt?: string }
interface PropostaDoc { leadNome: string; status: string; updatedAt?: string }
interface ReceitaDoc { valor: number; data: string; recorrente: boolean }
interface DespesaDoc { valor: number; data: string }

const STATUS_PROJETO_EM_CURSO = ['EXECUCAO', 'APROVACAO', 'ENTREGA']

// ─── Factos: diário ──────────────────────────────────────────────────────────
async function calcularFactosDiarios() {
  const [projetos, tarefas, leads, propostas] = await Promise.all([
    fetchColecao<ProjetoDoc>('projetos'),
    fetchColecao<TarefaDoc>('tarefas'),
    fetchColecao<LeadDoc>('leads'),
    fetchColecao<PropostaDoc>('propostas'),
  ])

  const hoje = hojeISO()
  function nomeClienteDaTarefa(t: TarefaDoc): string {
    const projeto = projetos.find(p => p.clienteId === t.clienteId)
    return projeto?.clienteNome || t.clienteId
  }

  const projetosEmCurso = projetos
    .filter(p => STATUS_PROJETO_EM_CURSO.includes(p.status))
    .map(p => ({ nome: p.nome, cliente: p.clienteNome, status: p.status }))

  const tarefasConcluidasHoje = tarefas
    .filter(t => t.concluidaEm === hoje)
    .map(t => ({ titulo: t.titulo, cliente: nomeClienteDaTarefa(t) }))

  const tarefasAtrasadas = tarefas
    .filter(t => t.dataLimite && t.dataLimite < hoje && t.status !== 'CONCLUIDA')
    .map(t => ({ titulo: t.titulo, cliente: nomeClienteDaTarefa(t), dataLimite: t.dataLimite!, diasAtraso: diasEntre(t.dataLimite!) }))

  const tarefasBloqueadas = tarefas
    .filter(t => t.status === 'BLOQUEADA')
    .map(t => ({ titulo: t.titulo, cliente: nomeClienteDaTarefa(t) }))

  const leadsSemContactoRecente = leads
    .filter(l => !['FECHADO', 'PERDIDO'].includes(l.status) && l.updatedAt && diasEntre(l.updatedAt) >= 4)
    .map(l => ({ empresa: l.empresa, status: l.status, diasSemContacto: diasEntre(l.updatedAt!) }))

  const propostasSemResposta = propostas
    .filter(p => p.status === 'ENVIADA' && p.updatedAt && diasEntre(p.updatedAt) >= 3)
    .map(p => ({ leadNome: p.leadNome, diasEnviada: diasEntre(p.updatedAt!) }))

  return {
    data: hoje,
    projetosEmCurso, tarefasConcluidasHoje, tarefasAtrasadas, tarefasBloqueadas,
    leadsSemContactoRecente, propostasSemResposta,
  }
}

// ─── Factos: semanal ─────────────────────────────────────────────────────────
async function calcularFactosSemanais() {
  const [projetos, tarefas, clientes, leads, propostas, receitas] = await Promise.all([
    fetchColecao<ProjetoDoc>('projetos'),
    fetchColecao<TarefaDoc>('tarefas'),
    fetchColecao<ClienteDoc>('clientes'),
    fetchColecao<LeadDoc>('leads'),
    fetchColecao<PropostaDoc>('propostas'),
    fetchColecao<ReceitaDoc>('receitas'),
  ])

  const agora = new Date()
  const inicio = new Date(agora.getTime() - 7 * 86400000)
  const periodoInicio = inicio.toISOString().slice(0, 10)
  const periodoFim = agora.toISOString().slice(0, 10)
  const mesAtual = agora.getUTCMonth() + 1
  const anoAtual = agora.getUTCFullYear()

  function nomeClienteDaTarefa(t: TarefaDoc): string {
    const projeto = projetos.find(p => p.clienteId === t.clienteId)
    return projeto?.clienteNome || t.clienteId
  }

  const projetosAtivos = projetos.filter(p => p.status !== 'CONCLUIDO').length

  const projetosAtrasados = projetos
    .filter(p => p.status !== 'CONCLUIDO' && (p.ano < anoAtual || (p.ano === anoAtual && p.mes < mesAtual)))
    .map(p => ({ nome: p.nome, cliente: p.clienteNome, mes: p.mes, ano: p.ano }))

  const tarefasConcluidasSemana = tarefas.filter(t => t.concluidaEm && t.concluidaEm >= periodoInicio && t.concluidaEm <= periodoFim).length
  const tarefasBloqueadas = tarefas.filter(t => t.status === 'BLOQUEADA').map(t => ({ titulo: t.titulo, cliente: nomeClienteDaTarefa(t) }))

  const clientesComProjetoEsteMes = new Set(projetos.filter(p => p.mes === mesAtual && p.ano === anoAtual).map(p => p.clienteId))
  const clientesSemProjetoEsteMes = clientes
    .filter(c => c.status === 'ATIVO' && !clientesComProjetoEsteMes.has(c.id))
    .map(c => ({ empresa: c.empresa }))

  const distribuicaoPorCategoriaMap = new Map<string, number>()
  tarefas
    .filter(t => t.concluidaEm && t.concluidaEm >= periodoInicio && t.concluidaEm <= periodoFim)
    .forEach(t => distribuicaoPorCategoriaMap.set(t.categoria, (distribuicaoPorCategoriaMap.get(t.categoria) || 0) + 1))
  const distribuicaoPorCategoria = Array.from(distribuicaoPorCategoriaMap.entries()).map(([categoria, quantidade]) => ({ categoria, quantidade }))

  const leadsNovosSemana = leads.filter(l => l.updatedAt && l.updatedAt >= periodoInicio).length
  const leadsFechadosSemana = leads.filter(l => l.status === 'FECHADO' && l.updatedAt && l.updatedAt >= periodoInicio).length

  const mrrAtual = receitas.filter(r => r.recorrente).reduce((s, r) => s + (r.valor || 0), 0)
  const propostasAbertas = propostas.filter(p => ['PREPARACAO', 'ENVIADA', 'NEGOCIACAO'].includes(p.status)).length

  return {
    periodoInicio, periodoFim,
    projetosAtivos, projetosAtrasados, tarefasConcluidasSemana, tarefasBloqueadas,
    clientesSemProjetoEsteMes, distribuicaoPorCategoria,
    leadsNovosSemana, leadsFechadosSemana, mrrAtual, propostasAbertas,
  }
}

// ─── Factos: mensal ──────────────────────────────────────────────────────────
async function calcularFactosMensais() {
  const [projetos, tarefas, clientes, leads, receitas, despesas] = await Promise.all([
    fetchColecao<ProjetoDoc>('projetos'),
    fetchColecao<TarefaDoc>('tarefas'),
    fetchColecao<ClienteDoc>('clientes'),
    fetchColecao<LeadDoc>('leads'),
    fetchColecao<ReceitaDoc>('receitas'),
    fetchColecao<DespesaDoc>('despesas'),
  ])

  const agora = new Date()
  const mesAtual = agora.getUTCMonth() + 1
  const anoAtual = agora.getUTCFullYear()
  const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
  const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
  const prefixoMesAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`
  const prefixoMesAnterior = `${anoMesAnterior}-${String(mesAnterior).padStart(2, '0')}`

  const receitasDoMes = receitas.filter(r => r.data?.startsWith(prefixoMesAtual))
  const receitasMesAnterior = receitas.filter(r => r.data?.startsWith(prefixoMesAnterior))
  const despesasDoMes = despesas.filter(d => d.data?.startsWith(prefixoMesAtual))

  const mrrAtual = receitas.filter(r => r.recorrente).reduce((s, r) => s + (r.valor || 0), 0)
  const receitaDoMes = receitasDoMes.reduce((s, r) => s + (r.valor || 0), 0)
  const receitaMesAnterior = receitasMesAnterior.reduce((s, r) => s + (r.valor || 0), 0)
  const despesaDoMes = despesasDoMes.reduce((s, d) => s + (d.valor || 0), 0)

  const clientesAtivos = clientes.filter(c => c.status === 'ATIVO').length
  const clientesPausadosOuCancelados = clientes.filter(c => ['PAUSADO', 'CANCELADO'].includes(c.status)).length

  const tarefasConcluidasMes = tarefas.filter(t => t.concluidaEm?.startsWith(prefixoMesAtual)).length
  const tarefasAtrasadasMes = tarefas.filter(t => t.dataLimite?.startsWith(prefixoMesAtual) && t.status !== 'CONCLUIDA' && t.dataLimite! < hojeISO()).length
  const projetosConcluidosMes = projetos.filter(p => p.status === 'CONCLUIDO' && p.mes === mesAtual && p.ano === anoAtual).length

  const leadsNovosMes = leads.filter(l => l.updatedAt?.startsWith(prefixoMesAtual)).length
  const leadsFechadosMes = leads.filter(l => l.status === 'FECHADO' && l.updatedAt?.startsWith(prefixoMesAtual)).length
  const leadsPerdidosMes = leads.filter(l => l.status === 'PERDIDO' && l.updatedAt?.startsWith(prefixoMesAtual)).length

  return {
    mes: mesAtual, ano: anoAtual,
    mrrAtual, receitaDoMes, receitaMesAnterior, despesaDoMes,
    clientesAtivos, clientesPausadosOuCancelados,
    tarefasConcluidasMes, tarefasAtrasadasMes, projetosConcluidosMes,
    leadsNovosMes, leadsFechadosMes, leadsPerdidosMes,
    taxaConversao: leadsNovosMes > 0 ? Math.round((leadsFechadosMes / leadsNovosMes) * 100) : null,
  }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────
const INSTRUCOES_COMUNS = `
És o assistente operacional da Onda, uma agência digital. Vais escrever um relatório em português de Portugal, com base EXCLUSIVAMENTE nos factos fornecidos em JSON abaixo — nunca inventes números, nomes ou situações que não estejam nos dados.
Este sistema não tem responsáveis/donos atribuídos a tarefas — fala em termos de que clientes, leads ou projetos precisam de atenção, nunca de pessoas específicas da equipa.
Quando um dado estiver ausente ou uma lista vazia, diz isso explicitamente (ex: "sem tarefas atrasadas no momento") em vez de inventar informação.
Distingue sempre factos confirmados (os números dos dados) de situações que precisam de confirmação humana (ex: uma tarefa sem atualização não significa necessariamente que está parada).
Responde em JSON, com "secoes" (lista de {titulo, texto}, texto pode ter quebras de linha e marcadores "- " para listas) e "acoes" (lista de {prioridade: P1|P2|P3, texto} — P1 resolver hoje, P2 acompanhar, P3 pode aguardar).
`.trim()

function promptDiario(factos: Awaited<ReturnType<typeof calcularFactosDiarios>>): string {
  return `${INSTRUCOES_COMUNS}

Gera o RELATÓRIO DIÁRIO da agência Onda, para o dia ${factos.data}, com exactamente estas secções:
1. "Resumo do dia" — serviços em curso, concluídos hoje, atrasados ou parados, e o que mudou.
2. "Pendências e riscos" — tarefas com prazo ultrapassado, leads/propostas sem resposta, problemas que precisam de intervenção.
3. "Acompanhamento" — que clientes/leads precisam de contacto ou resposta, que informação falta pedir.

Factos (JSON):
${JSON.stringify(factos, null, 2)}`
}

function promptSemanal(factos: Awaited<ReturnType<typeof calcularFactosSemanais>>): string {
  return `${INSTRUCOES_COMUNS}

Gera o RELATÓRIO SEMANAL de gestão da agência Onda, para o período de ${factos.periodoInicio} a ${factos.periodoFim}, com exactamente estas secções:
1. "Projetos" — o que avançou, o que está bloqueado, o que está atrasado.
2. "Clientes" — quem precisa de contacto, que entregas estão pendentes (ex: clientes ativos sem projeto este mês).
3. "Execução" — tarefas concluídas e por concluir.
4. "Capacidade" — onde foi gasto o tempo (distribuição por categoria) e o que está a acumular.
5. "Comercial" — leads contactados/avançados, propostas em aberto.
6. "Decisões" — o que precisa de ser decidido para a operação avançar.
7. "Próxima semana" — três a cinco prioridades.

Factos (JSON):
${JSON.stringify(factos, null, 2)}`
}

function promptMensal(factos: Awaited<ReturnType<typeof calcularFactosMensais>>): string {
  return `${INSTRUCOES_COMUNS}

Gera o RELATÓRIO MENSAL estratégico da agência Onda, para ${factos.mes}/${factos.ano}, com exactamente estas secções:
1. "Financeiro" — MRR atual, receita do mês vs mês anterior, despesas do mês.
2. "Clientes" — clientes ativos, clientes pausados/cancelados, retenção.
3. "Operação" — tarefas e projetos concluídos no mês, taxa de atraso.
4. "Comercial" — novos leads, taxa de conversão, leads perdidos.
5. "Comparação com o mês anterior" — o que melhorou, o que piorou.
6. "Prioridades do próximo mês" — três a cinco objetivos.

Factos (JSON):
${JSON.stringify(factos, null, 2)}`
}

// ─── Gerador principal ───────────────────────────────────────────────────────
export async function gerarRelatorio(tipo: RelatorioTipo) {
  let dados: Record<string, unknown>
  let prompt: string
  let periodoInicio: string
  let periodoFim: string

  if (tipo === 'diario') {
    const factos = await calcularFactosDiarios()
    dados = factos; prompt = promptDiario(factos)
    periodoInicio = factos.data; periodoFim = factos.data
  } else if (tipo === 'semanal') {
    const factos = await calcularFactosSemanais()
    dados = factos; prompt = promptSemanal(factos)
    periodoInicio = factos.periodoInicio; periodoFim = factos.periodoFim
  } else {
    const factos = await calcularFactosMensais()
    dados = factos; prompt = promptMensal(factos)
    periodoInicio = `${factos.ano}-${String(factos.mes).padStart(2, '0')}-01`
    periodoFim = periodoInicio
  }

  const resultado = await gerarComGemini(prompt)

  const db = getAdminDb()
  const ref = await db.collection('relatorios').add({
    tipo, periodoInicio, periodoFim,
    secoes: resultado.secoes, acoes: resultado.acoes, dados,
    geradoEm: new Date(),
  })

  const titulo = { diario: 'Relatório diário', semanal: 'Relatório semanal', mensal: 'Relatório mensal' }[tipo]
  await enviarPushParaTodos({
    title: `📊 ${titulo} pronto`,
    body: resultado.acoes[0]?.texto || 'Já podes consultar o relatório no Onda OS.',
    url: `/relatorios/${ref.id}`,
  })

  return { id: ref.id, tipo, periodoInicio, periodoFim, secoes: resultado.secoes, acoes: resultado.acoes }
}
