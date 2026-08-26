import type { CSSProperties } from 'react'
import { KPI_CATEGORIA_INFO, formatarKPIValor, variacaoKPI, type KPICategoria } from '@/lib/db'
import type { Cliente, Projeto, KPIValor, Tarefa } from '@/lib/db'

// Documento impresso com identidade fixa da Onda Digital — usa cores literais
// em vez das CSS variables do tema da app, porque o PDF tem de ter sempre o
// mesmo aspecto independentemente do tema (claro/escuro) de quem o gera.
const AZUL = '#0ea5e9'
const TEXTO = '#0f172a'
const TEXTO_SEC = '#64748b'
const BORDA = '#e2e8f0'
const CARD_BG = '#f8fafc'

const PAGE_W = 794
const PAGE_H = 1123

const pageBase: CSSProperties = {
  width: PAGE_W, height: PAGE_H, backgroundColor: '#ffffff', color: TEXTO,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  overflow: 'hidden', position: 'relative', boxSizing: 'border-box',
}

export interface RelatorioPDFProps {
  cliente: Cliente
  projeto: Projeto
  kpiValores: KPIValor[]
  kpiValoresAnteriores: KPIValor[]
  kpiValores3Meses: { mes: number; ano: number; valores: KPIValor[] }[]
  tarefasConcluidas: Tarefa[]
  proximosPassos: string
  incluirTarefas: boolean
}

function nomeMesAno(mes: number, ano: number) {
  return new Date(ano, mes - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}
function nomeMesCurto(mes: number, ano: number) {
  const s = new Date(ano, mes - 1).toLocaleDateString('pt-PT', { month: 'short' })
  return s.replace('.', '').replace(/^\w/, c => c.toUpperCase())
}

function Variacao({ valor }: { valor: number | null }) {
  const cor = valor === null || valor === 0 ? TEXTO_SEC : valor > 0 ? '#16a34a' : '#dc2626'
  const seta = valor === null ? '—' : valor > 0 ? '↑' : valor < 0 ? '↓' : '—'
  return <span style={{ color: cor, fontWeight: 600, fontSize: 12 }}>{valor === null ? '—' : `${seta} ${Math.abs(valor)}%`}</span>
}

function MiniBarras({ pontos, unidade }: { pontos: { label: string; valor: number | null }[]; unidade: KPIValor['kpiUnidade'] }) {
  const max = Math.max(1, ...pontos.map(p => p.valor ?? 0))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 44 }}>
      {pontos.map((p, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 34 }}>
          <div style={{ fontSize: 8, color: TEXTO_SEC }}>{p.valor === null ? '–' : formatarKPIValor(p.valor, unidade)}</div>
          <div style={{ width: '100%', height: 24, display: 'flex', alignItems: 'flex-end', backgroundColor: '#eef2f6', borderRadius: 2 }}>
            {p.valor !== null && (
              <div style={{ width: '100%', height: `${Math.max(6, (p.valor / max) * 100)}%`, backgroundColor: i === pontos.length - 1 ? AZUL : '#bcdff5', borderRadius: 2 }} />
            )}
          </div>
          <div style={{ fontSize: 7, color: TEXTO_SEC }}>{p.label}</div>
        </div>
      ))}
    </div>
  )
}

export function RelatorioPDF({ cliente, projeto, kpiValores, kpiValoresAnteriores, kpiValores3Meses, tarefasConcluidas, proximosPassos, incluirTarefas }: RelatorioPDFProps) {
  const kpiPrincipal = kpiValores.find(k => cliente.kpis?.find(c => c.kpiId === k.kpiId)?.isPrincipal) || kpiValores[0] || null
  const outrosKpis = kpiValores.filter(k => k.kpiId !== kpiPrincipal?.kpiId)
  const categoriasComValores = (Object.keys(KPI_CATEGORIA_INFO) as KPICategoria[])
    .filter(cat => kpiValores.some(k => k.kpiCategoria === cat))
  const geradoEm = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  function anteriorDe(kpiId: string) {
    return kpiValoresAnteriores.find(v => v.kpiId === kpiId)?.valor
  }

  return (
    <div>
      {/* ─── Capa ─── */}
      <div data-pdf-page style={pageBase}>
        <div style={{ height: 40, backgroundColor: AZUL, width: '100%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: PAGE_H - 40, gap: 14, padding: '0 60px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: AZUL, letterSpacing: '-0.02em' }}>Onda Digital</div>
          <div style={{ fontSize: 16, color: TEXTO_SEC, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Relatório Mensal</div>
          <div style={{ width: 60, height: 3, backgroundColor: AZUL, borderRadius: 2, margin: '10px 0' }} />
          <div style={{ fontSize: 28, fontWeight: 600, color: TEXTO }}>{cliente.empresa}</div>
          <div style={{ fontSize: 15, color: TEXTO_SEC, textTransform: 'capitalize' }}>{nomeMesAno(projeto.mes, projeto.ano)}</div>
        </div>
        <div style={{ position: 'absolute', bottom: 30, width: '100%', textAlign: 'center', fontSize: 10, color: TEXTO_SEC }}>
          Relatório gerado em {geradoEm}
        </div>
      </div>

      {/* ─── Resumo executivo ─── */}
      <div data-pdf-page style={{ ...pageBase, padding: 50 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: TEXTO, marginBottom: 4, textTransform: 'capitalize' }}>Resumo — {nomeMesAno(projeto.mes, projeto.ano)}</div>
        <div style={{ width: 40, height: 3, backgroundColor: AZUL, borderRadius: 2, marginBottom: 24 }} />

        {kpiPrincipal && (
          <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDA}`, borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: TEXTO_SEC, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{kpiPrincipal.kpiNome}</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: AZUL, marginBottom: 6 }}>{formatarKPIValor(kpiPrincipal.valor, kpiPrincipal.kpiUnidade)}</div>
            <Variacao valor={variacaoKPI(kpiPrincipal.valor, anteriorDe(kpiPrincipal.kpiId))} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {outrosKpis.map(k => (
            <div key={k.kpiId} style={{ border: `1px solid ${BORDA}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: TEXTO_SEC, marginBottom: 4 }}>{k.kpiNome}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: TEXTO }}>{formatarKPIValor(k.valor, k.kpiUnidade)}</span>
                <Variacao valor={variacaoKPI(k.valor, anteriorDe(k.kpiId))} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Detalhe por canal — uma página por categoria ─── */}
      {categoriasComValores.map(cat => {
        const doCategoria = kpiValores.filter(k => k.kpiCategoria === cat)
        return (
          <div key={cat} data-pdf-page style={{ ...pageBase, padding: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>{KPI_CATEGORIA_INFO[cat].icon}</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: TEXTO }}>{KPI_CATEGORIA_INFO[cat].label}</div>
            </div>
            <div style={{ width: 40, height: 3, backgroundColor: AZUL, borderRadius: 2, marginBottom: 20 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.7fr 1.3fr', gap: 8, fontSize: 10, color: TEXTO_SEC, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px 8px', borderBottom: `1px solid ${BORDA}` }}>
              <div>KPI</div><div>Mês atual</div><div>Mês anterior</div><div>Variação</div><div>Últimos 3 meses</div>
            </div>

            {doCategoria.map(k => {
              const anterior = anteriorDe(k.kpiId)
              const pontos = kpiValores3Meses.map(m => {
                const v = m.valores.find(x => x.kpiId === k.kpiId)?.valor
                return { label: nomeMesCurto(m.mes, m.ano), valor: v ?? null }
              })
              return (
                <div key={k.kpiId} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.7fr 1.3fr', gap: 8, alignItems: 'center', padding: '10px 4px', borderBottom: `1px solid ${BORDA}` }}>
                  <div style={{ fontSize: 12, color: TEXTO, fontWeight: 500 }}>{k.kpiNome}</div>
                  <div style={{ fontSize: 13, color: TEXTO, fontWeight: 600 }}>{formatarKPIValor(k.valor, k.kpiUnidade)}</div>
                  <div style={{ fontSize: 12, color: TEXTO_SEC }}>{anterior !== undefined ? formatarKPIValor(anterior, k.kpiUnidade) : '—'}</div>
                  <Variacao valor={variacaoKPI(k.valor, anterior)} />
                  {pontos.length > 0
                    ? <MiniBarras pontos={pontos} unidade={k.kpiUnidade} />
                    : <span style={{ fontSize: 10, color: TEXTO_SEC }}>Sem histórico</span>}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* ─── Trabalho realizado + próximos passos ─── */}
      <div data-pdf-page style={{ ...pageBase, padding: 50 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: TEXTO, marginBottom: 4 }}>Trabalho realizado</div>
        <div style={{ width: 40, height: 3, backgroundColor: AZUL, borderRadius: 2, marginBottom: 20 }} />

        {incluirTarefas && tarefasConcluidas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 30 }}>
            {tarefasConcluidas.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', backgroundColor: CARD_BG, border: `1px solid ${BORDA}`, borderRadius: 8 }}>
                <span style={{ color: '#16a34a', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 12, color: TEXTO }}>{t.titulo}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: TEXTO_SEC, marginBottom: 30 }}>
            {incluirTarefas ? 'Sem tarefas concluídas registadas este mês.' : 'Detalhe de tarefas não incluído neste relatório.'}
          </div>
        )}

        <div style={{ fontSize: 20, fontWeight: 700, color: TEXTO, marginBottom: 4 }}>Próximos passos</div>
        <div style={{ width: 40, height: 3, backgroundColor: AZUL, borderRadius: 2, marginBottom: 16 }} />
        <div style={{ fontSize: 13, color: TEXTO, lineHeight: 1.7, whiteSpace: 'pre-wrap', backgroundColor: CARD_BG, border: `1px solid ${BORDA}`, borderRadius: 8, padding: 16 }}>
          {proximosPassos.trim() || 'Sem notas para o próximo mês.'}
        </div>
      </div>
    </div>
  )
}
