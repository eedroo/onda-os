'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileBarChart, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { relatoriosService, RELATORIO_TIPO_LABEL, type Relatorio, type RelatorioTipo } from '@/lib/db'
import { auth } from '@/lib/firebase'
import { PageHeader } from '@/components/ui/PageHeader'

const TIPOS: RelatorioTipo[] = ['diario', 'semanal', 'mensal']
const TIPO_PILL: Record<RelatorioTipo, string> = { diario: 'pill-blue', semanal: 'pill-purple', mensal: 'pill-green' }

function formatarData(ts?: { toDate: () => Date }) {
  if (!ts) return '—'
  try { return ts.toDate().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<RelatorioTipo | 'TODOS'>('TODOS')
  const [gerando, setGerando] = useState<RelatorioTipo | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await relatoriosService.getAll()
      setRelatorios(r.sort((a, b) => (b.geradoEm?.toMillis?.() || 0) - (a.geradoEm?.toMillis?.() || 0)))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const listaFiltrada = useMemo(() => {
    if (filtro === 'TODOS') return relatorios
    return relatorios.filter(r => r.tipo === filtro)
  }, [relatorios, filtro])

  async function gerarAgora(tipo: RelatorioTipo) {
    if (!auth.currentUser) return
    setGerando(tipo)
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('/api/relatorios/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.erro || 'Falha ao gerar relatório')
      toast.success('Relatório gerado')
      await load()
    } catch (e) {
      console.error(e)
      toast.error('Não foi possível gerar o relatório. Confirma se a GEMINI_API_KEY está configurada.')
    } finally {
      setGerando(null)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      <PageHeader title="Relatórios" icon={FileBarChart} />

      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setFiltro('TODOS')}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: filtro === 'TODOS' ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: filtro === 'TODOS' ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: filtro === 'TODOS' ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            Todos
          </button>
          {TIPOS.map(t => (
            <button key={t} onClick={() => setFiltro(t)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: filtro === t ? '1px solid var(--brand)' : '1px solid var(--border-subtle)', backgroundColor: filtro === t ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'var(--bg-input)', color: filtro === t ? 'var(--accent-blue)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {RELATORIO_TIPO_LABEL[t]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPOS.map(t => (
            <button key={t} onClick={() => gerarAgora(t)} disabled={gerando !== null} className="btn btn-ghost">
              {gerando === t ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Gerar {RELATORIO_TIPO_LABEL[t].toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {listaFiltrada.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 13 }}>
            Sem relatórios ainda — gera um agora, ou aguarda a próxima geração automática.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 800, margin: '0 auto' }}>
            {listaFiltrada.map(r => (
              <Link key={r.id} href={`/relatorios/${r.id}`} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <span className={`pill ${TIPO_PILL[r.tipo]}`} style={{ flexShrink: 0 }}>{RELATORIO_TIPO_LABEL[r.tipo]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {r.periodoInicio === r.periodoFim ? r.periodoInicio : `${r.periodoInicio} a ${r.periodoFim}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Gerado {formatarData(r.geradoEm)}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{r.acoes?.filter(a => a.prioridade === 'P1').length || 0} P1</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
