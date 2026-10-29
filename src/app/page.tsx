'use client'

import { useEffect, useState } from 'react'
import { Users, Calendar, Briefcase, Coins, AlertTriangle, Plus, Loader2, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import {
  clientesService, projetosService, tarefasService, categoriasService,
  type Tarefa, type Cliente, type Projeto, type Categoria, type TarefaStatus,
} from '@/lib/db'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { NovaTarefaButton } from '@/components/tarefas/NovaTarefaButton'
import TarefasBoard from '@/components/tarefas/TarefasBoard'

export default function Home() {
  const { perfil } = useAuth()
  const primeiroNome = perfil?.nome?.split(' ')[0] || 'Utilizador'
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [categoriasConfig, setCategoriasConfig] = useState<Categoria[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const [c, p, cats] = await Promise.all([clientesService.getAll(), projetosService.getAll(), categoriasService.getAll()])
    setClientes(c)
    setProjetos(p)
    setCategoriasConfig(cats)
    if (c.length) {
      const ids = c.map(x => x.id!).filter(Boolean)
      const t = await tarefasService.getByClientes(ids)
      setTarefas(t)
    }
    setLoading(false)
  }

  async function recalcularProgressoDoProjeto(tarefasAtualizadas: Tarefa[], projetoId: string) {
    const doProjeto = tarefasAtualizadas.filter(t => t.projetoId === projetoId)
    if (!doProjeto.length) return
    const conc = doProjeto.filter(t => t.status === 'CONCLUIDA').length
    await projetosService.update(projetoId, { progresso: Math.round((conc / doProjeto.length) * 100) })
  }

  async function setStatusTarefa(tarefaId: string, novoStatus: TarefaStatus) {
    const atualizadas = tarefas.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t)
    setTarefas(atualizadas)
    await tarefasService.updateStatus(tarefaId, novoStatus)
    const tarefa = tarefas.find(t => t.id === tarefaId)
    if (tarefa) await recalcularProgressoDoProjeto(atualizadas, tarefa.projetoId)
  }

  async function toggleTarefa(tarefaId: string, statusAtual: TarefaStatus) {
    await setStatusTarefa(tarefaId, statusAtual === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA')
  }

  async function updateDataLimiteTarefa(tarefaId: string, data: string) {
    setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, dataLimite: data } : t))
    await tarefasService.update(tarefaId, { dataLimite: data || undefined })
  }

  async function duplicarTarefaComData(origemId: string, novaData: string) {
    const original = tarefas.find(t => t.id === origemId)
    if (!original) return
    const doProjeto = tarefas.filter(t => t.projetoId === original.projetoId)
    const ordem = doProjeto.length ? Math.max(...doProjeto.map(t => t.ordem)) + 1 : 1
    const dadosTarefa = {
      projetoId: original.projetoId, clienteId: original.clienteId, titulo: original.titulo,
      descricao: original.descricao, categoria: original.categoria, frequencia: original.frequencia,
      servicoId: original.servicoId, servicoNome: original.servicoNome, prioridade: original.prioridade,
      status: 'PENDENTE' as TarefaStatus, ordem, dataLimite: novaData,
    }
    const novoId = await tarefasService.create(dadosTarefa)
    const atualizadas = [...tarefas, { id: novoId, ...dadosTarefa }]
    setTarefas(atualizadas)
    await recalcularProgressoDoProjeto(atualizadas, original.projetoId)
  }

  const dateStr = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // KPIs reais
  const clientesAtivos = clientes.filter(c => c.status === 'ATIVO')
  const mrr = clientesAtivos.reduce((s, c) => s + c.mrr, 0)
  const projetosAtivos = projetos.filter(p => p.status !== 'CONCLUIDO')
  const tarefasPendentes = tarefas.filter(t => t.status === 'PENDENTE' || t.status === 'EM_CURSO')

  // Alertas — tarefas paradas, projectos sem progresso
  const alertas = []
  const projetosSemProgresso = projetosAtivos.filter(p => p.progresso === 0)
  if (projetosSemProgresso.length > 0) {
    alertas.push({ text: `${projetosSemProgresso.length} projecto(s) sem progresso`, sub: projetosSemProgresso.map(p => p.clienteNome).join(', '), dot: 'var(--accent-amber)' })
  }
  const clientesOnboarding = clientes.filter(c => c.status === 'ONBOARDING')
  if (clientesOnboarding.length > 0) {
    alertas.push({ text: `${clientesOnboarding.length} cliente(s) em onboarding`, sub: clientesOnboarding.map(c => c.empresa).join(', '), dot: 'var(--accent-red)' })
  }
  if (tarefasPendentes.length > 10) {
    alertas.push({ text: `${tarefasPendentes.length} tarefas pendentes`, sub: 'Verifica a página de Tarefas', dot: 'var(--accent-amber)' })
  }

  const kpis = [
    { label: 'Clientes ativos',   value: clientesAtivos.length.toString(), sub: `${clientes.filter(c => c.status === 'ONBOARDING').length} em onboarding`, color: 'var(--accent-blue)',   border: 'var(--accent-blue)',   icon: Briefcase },
    { label: 'Projetos ativos',   value: projetosAtivos.length.toString(),  sub: `${projetos.filter(p => p.status === 'CONCLUIDO').length} concluídos`,      color: 'var(--accent-teal)',   border: 'var(--accent-teal)',   icon: Calendar },
    { label: 'Tarefas pendentes', value: tarefasPendentes.length.toString(), sub: 'este mês',                                                                color: 'var(--accent-amber)',  border: 'var(--accent-amber)',  icon: Users },
    { label: 'MRR',               value: `${mrr.toLocaleString('pt-PT')}€`, sub: `${clientesAtivos.length} clientes`,                                        color: 'var(--accent-purple)', border: 'var(--accent-purple)', icon: Coins },
  ]

  const atalhoStyle = { textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, transition: 'border-color 0.15s', fontSize: 12, fontWeight: 500, cursor: 'pointer' }
  const clienteNomePorId = Object.fromEntries(clientes.map(c => [c.id, c.empresa]))
  const projetoNomePorId = Object.fromEntries(projetos.map(p => [p.id, p.nome]))

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>

      <PageHeader title={`Bom dia, ${primeiroNome} 👋`} subtitle={dateStr[0].toUpperCase() + dateStr.slice(1)} />

      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="card" style={{ padding: '12px 14px', borderTop: `2px solid ${k.border}` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon size={12} /> {k.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>{k.sub}</div>
              </div>
            )
          })}
        </div>

        {/* Tarefas da semana */}
        <div className="card" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckSquare size={12} /> Tarefas da semana
            </div>
            <Link href="/tarefas" style={{ fontSize: 11, color: 'var(--accent-blue)', textDecoration: 'none' }}>Ver todas →</Link>
          </div>

          {tarefas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text-faint)' }}>
              {projetos.length === 0 ? 'Cria os projetos do mês primeiro' : '✅ Tudo em dia!'}
            </div>
          ) : (
            <TarefasBoard
              tarefas={tarefas}
              categoriasConfig={categoriasConfig}
              onToggle={toggleTarefa}
              onSetStatus={setStatusTarefa}
              onUpdateDataLimite={updateDataLimiteTarefa}
              onDuplicar={duplicarTarefaComData}
              clienteNomePorId={clienteNomePorId}
              projetoNomePorId={projetoNomePorId}
              esconderConcluidasInicial
            />
          )}
        </div>

        {/* Alertas */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={12} /> Atenção
          </div>

          {alertas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text-faint)' }}>
                ✅ Tudo em ordem!
              </div>
            ) : (
              alertas.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }} className="last:border-0">
                  <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: a.dot, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{a.sub}</div>
                  </div>
                </div>
              ))
            )}
        </div>

        {/* Progresso dos projectos */}
        {projetosAtivos.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Projetos do mês
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
              {projetosAtivos.slice(0,6).map(p => (
                <Link key={p.id} href={`/projetos/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)', transition: 'border-color 0.15s', cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.clienteNome}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.progresso}%`, backgroundColor: p.progresso >= 75 ? 'var(--accent-green)' : p.progresso >= 40 ? 'var(--brand)' : 'var(--accent-amber)', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{p.progresso}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Atalhos */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={12} /> Atalhos rápidos
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 8 }}>
            <Link href="/clientes/novo" style={atalhoStyle}><span style={{ color: 'var(--accent-blue)' }}>+ Cliente</span></Link>
            <Link href="/projetos" style={atalhoStyle}><span style={{ color: 'var(--accent-teal)' }}>+ Projetos</span></Link>
            <NovaTarefaButton className="" style={atalhoStyle} onCriada={load}>
              <span style={{ color: 'var(--accent-green)' }}>+ Tarefas</span>
            </NovaTarefaButton>
            <Link href="/financeiro" style={atalhoStyle}><span style={{ color: 'var(--accent-purple)' }}>+ Financeiro</span></Link>
            <Link href="/leads" style={atalhoStyle}><span style={{ color: 'var(--accent-amber)' }}>+ Lead</span></Link>
          </div>
        </div>

      </div>
    </div>
  )
}
